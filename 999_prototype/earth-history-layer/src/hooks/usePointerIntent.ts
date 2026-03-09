import { useCallback, useRef, useState } from 'react'

interface PointerIntentResult {
    isDragging: boolean
    onPointerDown: (e: React.PointerEvent | PointerEvent) => void
    onPointerMove: (e: React.PointerEvent | PointerEvent) => void
    onPointerUp: (e: React.PointerEvent | PointerEvent) => void
}

const DRAG_THRESHOLD = 5 // px
const DRAG_SENSITIVITY = 0.0055

interface UsePointerIntentOptions {
    onDrag?: (deltaX: number, deltaY: number) => void
}

/**
 * タッチ/ドラッグ競合を制御するフック。
 * ポインタ移動が5px以下ならタップ、それ以上ならドラッグと判定。
 * ドラッグ中はホバー判定を無効化するためのフラグを返す。
 */
export function usePointerIntent(options: UsePointerIntentOptions = {}): PointerIntentResult {
    const [isDragging, setIsDragging] = useState(false)
    const startPos = useRef<{ x: number; y: number } | null>(null)
    const lastPos = useRef<{ x: number; y: number } | null>(null)
    const dragging = useRef(false)

    const onPointerDown = useCallback((e: React.PointerEvent | PointerEvent) => {
        startPos.current = { x: e.clientX, y: e.clientY }
        lastPos.current = { x: e.clientX, y: e.clientY }
        dragging.current = false
        setIsDragging(false)
    }, [])

    const onPointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
        if (!startPos.current || !lastPos.current) return

        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y

        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            dragging.current = true
            setIsDragging(true)
        }

        if (dragging.current) {
            const deltaX = (e.clientX - lastPos.current.x) * DRAG_SENSITIVITY
            const deltaY = (e.clientY - lastPos.current.y) * DRAG_SENSITIVITY
            options.onDrag?.(deltaX, deltaY)
        }

        lastPos.current = { x: e.clientX, y: e.clientY }
    }, [options])

    const onPointerUp = useCallback(() => {
        startPos.current = null
        lastPos.current = null
        // ドラッグ終了後に少し遅延してリセット（ホバー判定の誤爆防止）
        setTimeout(() => {
            dragging.current = false
            setIsDragging(false)
        }, 100)
    }, [])

    return { isDragging, onPointerDown, onPointerMove, onPointerUp }
}
