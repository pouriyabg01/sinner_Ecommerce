<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;

/**
 * HTML آزادی که ادمین می‌نویسد (سکشن «متن آزاد») بی‌واسطه در صفحه نشانده می‌شود،
 * پس فقط تگ‌ها و attributeهای فهرست سفید می‌مانند تا اسکریپتی به صفحه راه پیدا نکند.
 */
final class HtmlSanitizer
{
    /** تگ مجاز ← attributeهای مجازش */
    private const TAGS = [
        'p' => [], 'br' => [], 'hr' => [], 'div' => [], 'span' => [],
        'h2' => [], 'h3' => [], 'h4' => [],
        'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'u' => [], 's' => [], 'small' => [],
        'ul' => [], 'ol' => [], 'li' => [],
        'blockquote' => [], 'code' => [], 'pre' => [],
        'a' => ['href', 'title', 'target'],
    ];

    /** این تگ‌ها با محتوایشان حذف می‌شوند؛ بقیه‌ی تگ‌های ناشناس فقط باز می‌شوند و متنشان می‌ماند */
    private const DROP = [
        'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'noscript',
        'template', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'title', 'head',
        'meta', 'link', 'base',
    ];

    public static function clean(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        $doc = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        // اعلان encoding لازم است، وگرنه libxml متن فارسی را Latin-1 می‌خواند
        $doc->loadHTML(
            '<?xml encoding="UTF-8"><div>'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $doc->getElementsByTagName('div')->item(0);
        if (! $root) {
            return '';
        }
        self::walk($root);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return $out;
    }

    private static function walk(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMText && $child->nodeType === XML_TEXT_NODE) {
                continue;
            }
            // کامنت، CDATA و processing instruction
            if (! $child instanceof DOMElement) {
                $node->removeChild($child);

                continue;
            }

            $tag = strtolower($child->tagName);
            if (in_array($tag, self::DROP, true)) {
                $node->removeChild($child);

                continue;
            }

            self::walk($child);

            if (! isset(self::TAGS[$tag])) {
                while ($child->firstChild) {
                    $node->insertBefore($child->firstChild, $child);
                }
                $node->removeChild($child);

                continue;
            }

            foreach (iterator_to_array($child->attributes) as $attr) {
                if (! in_array(strtolower($attr->name), self::TAGS[$tag], true)) {
                    $child->removeAttribute($attr->name);
                }
            }

            if ($tag === 'a') {
                self::cleanLink($child);
            }
        }
    }

    private static function cleanLink(DOMElement $a): void
    {
        if ($a->hasAttribute('href') && ! self::isSafeUrl($a->getAttribute('href'))) {
            $a->removeAttribute('href');
        }

        if ($a->hasAttribute('target')) {
            $a->setAttribute('target', '_blank');
            $a->setAttribute('rel', 'noopener noreferrer');
        }
    }

    /** مرورگر فاصله و کاراکترهای کنترلی را از scheme حذف می‌کند، پس «java script:» هم اجرا می‌شود؛ فقط schemeهای شناخته قبول‌اند */
    private static function isSafeUrl(string $url): bool
    {
        $url = preg_replace('/[\x00-\x20\x7F]+/', '', $url) ?? '';

        return (bool) preg_match('~^(https?:|mailto:|tel:|/|#)~i', $url);
    }
}
