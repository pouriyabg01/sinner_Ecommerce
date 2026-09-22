'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState({ x: 50, y: 50, on: false })

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-square overflow-hidden rounded-card border border-border bg-ink-950"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setZoom({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
            on: true,
          })
        }}
        onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image
              src={images[active]}
              alt={alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover transition-transform duration-200"
              style={
                zoom.on
                  ? { transform: 'scale(1.7)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
                  : undefined
              }
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-2.5">
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => setActive(i)}
            aria-label={`تصویر ${i + 1}`}
            className={cn(
              'relative size-18 overflow-hidden rounded-xl border-2 bg-ink-950 transition-all duration-200',
              active === i ? 'border-brand-500' : 'border-transparent opacity-60 hover:opacity-100',
            )}
          >
            <Image src={src} alt="" fill sizes="72px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
