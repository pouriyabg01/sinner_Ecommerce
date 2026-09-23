<?php

namespace Tests\Unit;

use App\Support\HtmlSanitizer;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class HtmlSanitizerTest extends TestCase
{
    public static function attacks(): array
    {
        return [
            'script' => ['<p>سلام</p><script>alert(1)</script>'],
            'uppercase script' => ['<SCRIPT>alert(1)</SCRIPT>'],
            'img onerror' => ['<img src=x onerror=alert(1)>'],
            'event handler' => ['<p onclick="alert(1)">x</p>'],
            'javascript href' => ['<a href="javascript:alert(1)">x</a>'],
            'entity-encoded href' => ['<a href="jav&#x09;ascript&#58;alert(1)">x</a>'],
            'data href' => ['<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>'],
            'svg onload' => ['<svg onload=alert(1)><circle/></svg>'],
            'iframe' => ['<iframe src="javascript:alert(1)"></iframe>'],
            'style attribute' => ['<p style="background:url(javascript:alert(1))">x</p>'],
            'nested in unknown tag' => ['<details open ontoggle=alert(1)><summary>x</summary></details>'],
            'broken markup' => ['<p <script>alert(1)</script>'],
            'comment' => ['<!--<script>alert(1)</script>-->'],
        ];
    }

    #[DataProvider('attacks')]
    public function test_strips_script_vectors(string $input): void
    {
        $out = strtolower(HtmlSanitizer::clean($input));

        $this->assertStringNotContainsString('<script', $out);
        $this->assertStringNotContainsString('javascript:', $out);
        $this->assertStringNotContainsString('data:', $out);
        $this->assertDoesNotMatchRegularExpression('/\son\w+\s*=/', $out);
        $this->assertStringNotContainsString('<iframe', $out);
        $this->assertStringNotContainsString('<svg', $out);
        $this->assertStringNotContainsString('<img', $out);
        $this->assertStringNotContainsString('style=', $out);
    }

    public function test_keeps_allowed_markup_and_persian_text(): void
    {
        $html = '<h3>گارانتی</h3><p>متن <strong>پررنگ</strong> و <a href="https://example.com/x?a=1&amp;b=2">لینک</a></p><ul><li>یک</li></ul>';

        $this->assertSame($html, HtmlSanitizer::clean($html));
    }

    public function test_unwraps_unknown_tags_but_keeps_text(): void
    {
        $this->assertSame('<p>متن</p>', HtmlSanitizer::clean('<p><font color="red">متن</font></p>'));
    }

    public function test_target_blank_links_get_noopener(): void
    {
        $this->assertSame(
            '<a href="/about" target="_blank" rel="noopener noreferrer">x</a>',
            HtmlSanitizer::clean('<a href="/about" target="_top" rel="opener">x</a>')
        );
    }

    public function test_empty_input(): void
    {
        $this->assertSame('', HtmlSanitizer::clean(null));
        $this->assertSame('', HtmlSanitizer::clean('   '));
    }
}
