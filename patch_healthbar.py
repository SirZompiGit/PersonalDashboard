import sys

with open('src/components/HealthBarItem.tsx', 'r') as f:
    code = f.read()

# 1. Add barContainerRef
code = code.replace("const prevValueRef = useRef(bar.currentValue);", "const prevValueRef = useRef(bar.currentValue);\n  const barContainerRef = useRef<HTMLDivElement>(null);\n\n  useEffect(() => {\n    if (!isMouseDown || activeBarIdRef.current !== bar.id || readOnly) return;\n\n    const handleMouseMove = (e: MouseEvent) => {\n      if (!barContainerRef.current) return;\n      const rect = barContainerRef.current.getBoundingClientRect();\n      let newPercentage = 0;\n      if (layout === 'vertical') {\n        const y = e.clientY - rect.top;\n        newPercentage = 1 - (y / rect.height);\n      } else {\n        const x = e.clientX - rect.left;\n        newPercentage = x / rect.width;\n      }\n      newPercentage = Math.max(0, Math.min(1, newPercentage));\n      const newValue = Math.round(newPercentage * bar.maxValue);\n      if (newValue !== bar.currentValue) {\n        handleSegmentInteraction(bar, newValue);\n      }\n    };\n\n    window.addEventListener('mousemove', handleMouseMove);\n    return () => window.removeEventListener('mousemove', handleMouseMove);\n  }, [isMouseDown, bar, layout, readOnly, handleSegmentInteraction, activeBarIdRef]);")


# 2. Update the vertical bar container
code = code.replace("className={`flex flex-col-reverse w-full h-full rounded bg-[#1a1d23] overflow-hidden border border-[#2d333d]", "ref={barContainerRef}\n                className={`flex flex-col-reverse w-full h-full rounded bg-[#1a1d23] overflow-hidden border border-[#2d333d]")

# 3. Update the horizontal bar container
code = code.replace("className={`flex h-8 w-full rounded-lg bg-[#1a1d23] overflow-hidden border border-[#2d333d]", "ref={barContainerRef}\n            className={`flex h-8 w-full rounded-lg bg-[#1a1d23] overflow-hidden border border-[#2d333d]")


with open('src/components/HealthBarItem.tsx', 'w') as f:
    f.write(code)

