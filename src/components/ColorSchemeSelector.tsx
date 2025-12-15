/**
 * ============================================================================
 * COLOR SCHEME SELECTOR COMPONENT
 * ============================================================================
 * 
 * Interactive component for selecting and previewing color schemes.
 * Displays all 4 premium color schemes with preview cards.
 */

import { useColorScheme } from '@/context/ColorSchemeContext'
import { COLOR_SCHEMES, ColorScheme } from '@/lib/colorSchemes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ColorSchemeSelector() {
  const { colorScheme, setColorScheme } = useColorScheme()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
          Color Scheme
        </h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Choose a premium color scheme that matches your style and needs. Each scheme is optimized for different use cases and accessibility levels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((scheme) => {
          const schemeDef = COLOR_SCHEMES[scheme]
          const isSelected = colorScheme === scheme

          return (
            <Card
              key={scheme}
              variant="glass"
              className={cn(
                "cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                isSelected && "ring-2 ring-[hsl(var(--primary))] ring-offset-2"
              )}
              onClick={() => setColorScheme(scheme)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                      {schemeDef.name}
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {schemeDef.personality}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={schemeDef.wcagLevel === 'AAA' ? 'success' : 'default'}
                    className="text-xs"
                  >
                    {schemeDef.wcagLevel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Preview gradient */}
                <div className={cn(
                  "h-20 rounded-lg border border-[hsl(var(--border))]",
                  schemeDef.preview
                )} />

                {/* Description */}
                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {schemeDef.description}
                </p>

                {/* Best for */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                    Best for:
                  </p>
                  <ul className="text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
                    {schemeDef.bestFor.map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[hsl(var(--primary))] mt-0.5">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Color preview swatches */}
                <div className="flex items-center gap-2 pt-2 border-t border-[hsl(var(--border))]">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                      Primary
                    </p>
                    <div className="flex gap-1">
                      <div
                        className="h-6 w-6 rounded border border-[hsl(var(--border))]"
                        style={{ backgroundColor: `hsl(${schemeDef.colors.primary['600']})` }}
                      />
                      <div
                        className="h-6 w-6 rounded border border-[hsl(var(--border))]"
                        style={{ backgroundColor: `hsl(${schemeDef.colors.primary['500']})` }}
                      />
                      <div
                        className="h-6 w-6 rounded border border-[hsl(var(--border))]"
                        style={{ backgroundColor: `hsl(${schemeDef.colors.primary['700']})` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                      Secondary
                    </p>
                    <div className="flex gap-1">
                      <div
                        className="h-6 w-6 rounded border border-[hsl(var(--border))]"
                        style={{ backgroundColor: `hsl(${schemeDef.colors.secondary['600']})` }}
                      />
                      <div
                        className="h-6 w-6 rounded border border-[hsl(var(--border))]"
                        style={{ backgroundColor: `hsl(${schemeDef.colors.secondary['500']})` }}
                      />
                      <div
                        className="h-6 w-6 rounded border border-[hsl(var(--border))]"
                        style={{ backgroundColor: `hsl(${schemeDef.colors.secondary['700']})` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info banner */}
      <div className="glass-card rounded-lg p-4 border border-[hsl(var(--border))]">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              About Color Schemes
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Color schemes override your theme colors to provide optimized palettes for different use cases. 
              The <strong>Mocha</strong> scheme is recommended for most users (70% default choice). 
              <strong> Clarity</strong> provides maximum accessibility (WCAG AAA) and is 100% colorblind-safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

