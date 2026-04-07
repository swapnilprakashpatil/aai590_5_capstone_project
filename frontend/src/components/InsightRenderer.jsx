import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import mermaid from 'mermaid'

// Initialize mermaid
mermaid.initialize({ 
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system'
})

/**
 * Safely renders HTML content
 * Uses span for inline content, div for block content
 */
function HtmlContent({ html, className = '' }) {
  const isInline = className.includes('inline')
  const Component = isInline ? 'span' : 'div'
  return <Component className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

/**
 * Renders a mermaid diagram from diagram code
 */
function MermaidDiagram({ code }) {
  const elementRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!code || !elementRef.current) return

    const renderDiagram = async () => {
      try {
        setError(null)
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        
        // Clear previous content
        elementRef.current.innerHTML = ''
        
        // Render mermaid diagram
        const { svg } = await mermaid.render(id, code)
        elementRef.current.innerHTML = svg
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError(err.message)
      }
    }

    renderDiagram()
  }, [code])

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">
          <strong>Diagram Rendering Error:</strong> {error}
        </p>
        <details className="text-xs text-red-500 dark:text-red-300">
          <summary className="cursor-pointer">Show diagram code</summary>
          <pre className="mt-2 overflow-x-auto bg-red-100 dark:bg-red-900/40 p-2 rounded">{code}</pre>
        </details>
      </div>
    )
  }

  return (
    <div 
      ref={elementRef} 
      className="mermaid-diagram bg-white dark:bg-gray-800 rounded-lg p-4 overflow-x-auto"
    />
  )
}

/**
 * Renders JSON health insights in a beautiful, user-friendly format
 * Accepts either 'data' (parsed JSON object) or 'content' (JSON string)
 */
export function InsightRenderer({ data: dataProp, content, agentType }) {
  // Expand all sections by default
  const [expandedSections, setExpandedSections] = useState(new Set([
    'summary', 'macros', 'highlights', 'recommendations',
    'immediate', 'user-risks', 'portions', 'frequency', 'pairings', 'advice',
    'alternatives', 'homemade', 'shopping',
    'timeline', 'disease-risks', 'cumulative', 'age-concerns', 'preventive',
    'rag', 'agents', 'model', 'dataflow'
  ]))

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // Use 'data' prop if provided, otherwise parse 'content'
  let data
  if (dataProp) {
    data = dataProp
  } else if (content) {
    try {
      data = typeof content === 'string' ? JSON.parse(content) : content
    } catch (e) {
      return (
        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {content}
        </div>
      )
    }
  } else {
    return <div className="text-gray-500">No data available</div>
  }

  // Render based on agent type
  if (agentType === 'nutritional_information') {
    return <NutritionalAnalysisRenderer data={data} expanded={expandedSections} toggle={toggleSection} />
  } else if (agentType === 'health_risks') {
    return <HealthRisksRenderer data={data} expanded={expandedSections} toggle={toggleSection} />
  } else if (agentType === 'dietary_recommendations') {
    return <DietaryRecommendationsRenderer data={data} expanded={expandedSections} toggle={toggleSection} />
  } else if (agentType === 'alternative_products') {
    return <AlternativeProductsRenderer data={data} expanded={expandedSections} toggle={toggleSection} />
  } else if (agentType === 'long_term_health') {
    return <LongTermHealthRenderer data={data} expanded={expandedSections} toggle={toggleSection} />
  } else if (agentType === 'technical_agentic_analysis') {
    return <TechnicalAnalysisRenderer data={data} expanded={expandedSections} toggle={toggleSection} />
  }

  // Default JSON renderer
  return (
    <pre className="text-sm overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

// Nutritional Analysis Renderer
function NutritionalAnalysisRenderer({ data, expanded, toggle }) {
  // Handle errors
  if (data.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
        <h3 className="text-red-900 dark:text-red-100 font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error Loading Nutritional Analysis
        </h3>
        <p className="text-red-800 dark:text-red-200 text-sm">{data.error}</p>
        {data.raw_content && (
          <details className="mt-2">
            <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer">Show raw content</summary>
            <pre className="text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">{data.raw_content}</pre>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {data.summary && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <HtmlContent html={data.summary} className="text-blue-900 dark:text-blue-100 font-medium" />
        </div>
      )}

      {/* Macronutrients Table */}
      {data.macronutrients && data.macronutrients.length > 0 && (
        <Section title="Macronutrient Breakdown" expanded={expanded} toggle={toggle} id="macros">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Nutrient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">% Daily Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Comment</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {data.macronutrients.map((nutrient, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{nutrient.nutrient}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{nutrient.amount}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{nutrient.percentage}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400"><HtmlContent html={nutrient.comment} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Key Highlights */}
      {data.key_highlights && data.key_highlights.length > 0 && (
        <Section title="Key Nutritional Highlights" expanded={expanded} toggle={toggle} id="highlights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.key_highlights.map((highlight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  highlight.positive
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  {highlight.positive ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className={`font-semibold ${highlight.positive ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                      {highlight.aspect}
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      <span className="font-medium">{highlight.value}</span>
                    </p>
                    <HtmlContent html={highlight.implication} className="text-sm text-gray-600 dark:text-gray-400 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Section title="Recommendations" expanded={expanded} toggle={toggle} id="recommendations">
          <ul className="space-y-2">
            {data.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
                {typeof rec === 'string' ? (
                  <HtmlContent html={rec} className="flex-1" />
                ) : typeof rec === 'object' && rec !== null ? (
                  <div className="flex-1">
                    {rec.text && <HtmlContent html={rec.text} className="block" />}
                    {rec.title && <strong className="block"><HtmlContent html={rec.title} className="inline" /></strong>}
                    {rec.description && <HtmlContent html={rec.description} className="block" />}
                    {!rec.text && !rec.title && !rec.description && (
                      <span className="text-gray-500">Invalid recommendation format</span>
                    )}
                  </div>
                ) : (
                  <span className="flex-1 text-gray-500">Invalid recommendation</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

// Health Risks Renderer
function HealthRisksRenderer({ data, expanded, toggle }) {
  // Handle errors
  if (data.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
        <h3 className="text-red-900 dark:text-red-100 font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error Loading Health Risks
        </h3>
        <p className="text-red-800 dark:text-red-200 text-sm">{data.error}</p>
        {data.raw_content && (
          <details className="mt-2">
            <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer">Show raw content</summary>
            <pre className="text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">{data.raw_content}</pre>
          </details>
        )}
      </div>
    )
  }

  const severityColors = {
    high: 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 text-red-900 dark:text-red-100',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 text-yellow-900 dark:text-yellow-100',
    low: 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100',
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {data.summary && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <HtmlContent html={data.summary} className="text-orange-900 dark:text-orange-100 font-medium" />
        </div>
      )}

      {/* Immediate Concerns */}
      {data.immediate_concerns && data.immediate_concerns.length > 0 && (
        <Section title="⚠️ Immediate Concerns" expanded={expanded} toggle={toggle} id="immediate">
          <div className="space-y-3">
            {data.immediate_concerns.map((concern, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${severityColors[concern.severity] || severityColors.medium}`}>
                <h4 className="font-bold text-lg mb-2">{concern.risk}</h4>
                <HtmlContent html={concern.details} className="text-sm mb-2" />
                <HtmlContent html={`<strong>Impact:</strong> ${concern.impact}`} className="text-sm font-medium" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* User-Specific Risks */}
      {data.user_specific_risks && data.user_specific_risks.length > 0 && (
        <Section title="Personalized Risk Assessment" expanded={expanded} toggle={toggle} id="user-risks">
          <div className="space-y-3">
            {data.user_specific_risks.map((risk, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100">{risk.condition}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    risk.risk_level === 'high' ? 'bg-red-200 text-red-900' :
                    risk.risk_level === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                    'bg-green-200 text-green-900'
                  }`}>
                    {risk.risk_level.toUpperCase()} RISK
                  </span>
                </div>
                <HtmlContent html={risk.explanation} className="text-sm text-gray-700 dark:text-gray-300 mb-2" />
                {risk.recommendation && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <HtmlContent html={`<strong>Recommendation:</strong> ${risk.recommendation}`} className="text-sm text-blue-900 dark:text-blue-100" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// Dietary Recommendations Renderer
function DietaryRecommendationsRenderer({ data, expanded, toggle }) {
  // Handle errors
  if (data.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
        <h3 className="text-red-900 dark:text-red-100 font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error Loading Dietary Recommendations
        </h3>
        <p className="text-red-800 dark:text-red-200 text-sm">{data.error}</p>
        {data.raw_content && (
          <details className="mt-2">
            <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer">Show raw content</summary>
            <pre className="text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">{data.raw_content}</pre>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.summary && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <HtmlContent html={data.summary} className="text-green-900 dark:text-green-100 font-medium" />
        </div>
      )}

      {/* Portion Recommendations */}
      {data.portion_recommendations && (
        <Section title="🍽️ Portion Recommendations" expanded={expanded} toggle={toggle} id="portions">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2">
              {data.portion_recommendations.safe_serving_size}
            </p>
            <HtmlContent html={data.portion_recommendations.reasoning} className="text-sm text-gray-700 dark:text-gray-300" />
          </div>
        </Section>
      )}

      {/* Frequency Guidance */}
      {data.frequency_guidance && (
        <Section title="📅 Frequency Guidance" expanded={expanded} toggle={toggle} id="frequency">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Recommended</h4>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{data.frequency_guidance.recommended_frequency}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Maximum Per Week</h4>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{data.frequency_guidance.max_per_week}</p>
            </div>
          </div>
          <HtmlContent html={data.frequency_guidance.reasoning} className="text-sm text-gray-700 dark:text-gray-300 mt-3" />
        </Section>
      )}

      {/* Pairing Suggestions */}
      {data.pairing_suggestions && data.pairing_suggestions.length > 0 && (
        <Section title="🥗 Pairing Suggestions" expanded={expanded} toggle={toggle} id="pairings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.pairing_suggestions.map((pairing, idx) => (
              <div key={idx} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h4 className="font-bold text-green-900 dark:text-green-100 mb-1">{pairing.food}</h4>
                <HtmlContent html={pairing.benefit} className="text-sm text-green-800 dark:text-green-200 mb-2" />
                {pairing.example && (
                  <HtmlContent html={`<em>Example:</em> ${pairing.example}`} className="text-xs text-gray-600 dark:text-gray-400 italic" />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* User-Specific Advice */}
      {data.user_specific_advice && data.user_specific_advice.length > 0 && (
        <Section title="💡 Personalized Advice" expanded={expanded} toggle={toggle} id="advice">
          <div className="space-y-2">
            {data.user_specific_advice.map((advice, idx) => (
              <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <HtmlContent html={advice} className="text-sm text-blue-900 dark:text-blue-100" />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// Alternative Products Renderer
function AlternativeProductsRenderer({ data, expanded, toggle }) {
  // Handle errors
  if (data.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
        <h3 className="text-red-900 dark:text-red-100 font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error Loading Alternative Products
        </h3>
        <p className="text-red-800 dark:text-red-200 text-sm">{data.error}</p>
        {data.raw_content && (
          <details className="mt-2">
            <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer">Show raw content</summary>
            <pre className="text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">{data.raw_content}</pre>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.summary && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <HtmlContent html={data.summary} className="text-purple-900 dark:text-purple-100 font-medium" />
        </div>
      )}

      {/* Alternative Products */}
      {data.alternatives && data.alternatives.length > 0 && (
        <Section title="🔄 Healthier Alternatives" expanded={expanded} toggle={toggle} id="alternatives">
          <div className="space-y-4">
            {data.alternatives.map((alt, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-primary-200 dark:border-primary-800 hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <HtmlContent html={alt.product_name} className="font-bold text-lg text-gray-900 dark:text-gray-100" />
                    {alt.brand && <HtmlContent html={alt.brand} className="text-sm text-gray-600 dark:text-gray-400" />}
                  </div>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 rounded-full text-xs font-bold">
                    NOVA {alt.nova_class}
                  </span>
                </div>
                
                {alt.key_benefits && alt.key_benefits.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {alt.key_benefits.map((benefit, bidx) => (
                        <span key={bidx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-xs">
                          ✓ <HtmlContent html={benefit} className="inline" />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {alt.nutritional_comparison && (
                  <div className="text-sm">
                    {Object.entries(alt.nutritional_comparison).map(([key, value], cidx) => (
                      <div key={cidx} className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{key}:</span> <HtmlContent html={value} className="inline" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Homemade Options */}
      {data.homemade_options && data.homemade_options.length > 0 && (
        <Section title="🏠 Homemade Options" expanded={expanded} toggle={toggle} id="homemade">
          <div className="space-y-3">
            {data.homemade_options.map((option, idx) => (
              <div key={idx} className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <HtmlContent html={option.name} className="font-bold text-amber-900 dark:text-amber-100 mb-1" />
                <HtmlContent html={option.recipe} className="text-sm text-amber-800 dark:text-amber-200 mb-2" />
                <span className="inline-block px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 rounded text-xs">
                  <HtmlContent html={option.difficulty} className="inline" />
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Shopping Tips */}
      {data.shopping_tips && data.shopping_tips.length > 0 && (
        <Section title="🛒 Shopping Tips" expanded={expanded} toggle={toggle} id="shopping">
          <ul className="space-y-2">
            {data.shopping_tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                <HtmlContent html={tip} className="flex-1" />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

// Long-Term Health Renderer
function LongTermHealthRenderer({ data, expanded, toggle }) {
  // Handle errors
  if (data.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
        <h3 className="text-red-900 dark:text-red-100 font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error Loading Long-Term Health Analysis
        </h3>
        <p className="text-red-800 dark:text-red-200 text-sm">{data.error}</p>
        {data.raw_content && (
          <details className="mt-2">
            <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer">Show raw content</summary>
            <pre className="text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">{data.raw_content}</pre>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.summary && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <HtmlContent html={data.summary} className="text-indigo-900 dark:text-indigo-100 font-medium" />
        </div>
      )}

      {/* Timeline Projections */}
      {data.timeline_projections && data.timeline_projections.length > 0 && (
        <Section title="📈 Timeline Projections" expanded={expanded} toggle={toggle} id="timeline">
          <div className="space-y-4">
            {data.timeline_projections.map((projection, idx) => (
              <div key={idx} className={`rounded-lg p-4 border-l-4 ${
                projection.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                projection.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                'bg-green-50 dark:bg-green-900/20 border-green-500'
              }`}>
                <div className="flex items-baseline justify-between mb-2">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">{projection.timeframe}</h4>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{projection.frequency}</span>
                </div>
                <ul className="space-y-1">
                  {projection.potential_impacts.map((impact, iidx) => (
                    <li key={iidx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <HtmlContent html={impact} className="flex-1" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Disease Risk Changes */}
      {data.disease_risk_changes && data.disease_risk_changes.length > 0 && (
        <Section title="⚕️ Disease Risk Changes" expanded={expanded} toggle={toggle} id="disease-risks">
          <div className="space-y-3">
            {data.disease_risk_changes.map((risk, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100">{risk.condition}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    risk.risk_change === 'increased' ? 'bg-red-200 text-red-900' :
                    risk.risk_change === 'decreased' ? 'bg-green-200 text-green-900' :
                    'bg-gray-200 text-gray-900'
                  }`}>
                    {risk.risk_change.toUpperCase()} {risk.percentage}
                  </span>
                </div>
                <HtmlContent html={risk.explanation} className="text-sm text-gray-700 dark:text-gray-300 mb-2" />
                {risk.research_support && (
                  <HtmlContent html={risk.research_support} className="text-xs text-gray-500 dark:text-gray-400 italic" />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Cumulative Effects */}
      {data.cumulative_effects && data.cumulative_effects.length > 0 && (
        <Section title="🔄 Cumulative Effects" expanded={expanded} toggle={toggle} id="cumulative">
          <div className="space-y-2">
            {data.cumulative_effects.map((effect, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <HtmlContent html={effect} className="text-sm text-gray-700 dark:text-gray-300" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Age-Specific Concerns */}
      {data.age_specific_concerns && data.age_specific_concerns.length > 0 && (
        <Section title="👤 Age-Specific Concerns" expanded={expanded} toggle={toggle} id="age-concerns">
          <div className="space-y-2">
            {data.age_specific_concerns.map((concern, idx) => (
              <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                <HtmlContent html={concern} className="text-sm text-yellow-900 dark:text-yellow-100" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Preventive Measures */}
      {data.preventive_measures && data.preventive_measures.length > 0 && (
        <Section title="✅ Preventive Measures" expanded={expanded} toggle={toggle} id="preventive">
          <div className="space-y-2">
            {data.preventive_measures.map((measure, idx) => (
              <div key={idx} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <HtmlContent html={measure} className="text-sm text-green-900 dark:text-green-100" />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// Technical Analysis Renderer
function TechnicalAnalysisRenderer({ data, expanded, toggle }) {
  // Handle errors
  if (data.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
        <h3 className="text-red-900 dark:text-red-100 font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error Loading Technical Analysis
        </h3>
        <p className="text-red-800 dark:text-red-200 text-sm">{data.error}</p>
        {data.raw_content && (
          <details className="mt-2">
            <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer">Show raw content</summary>
            <pre className="text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">{data.raw_content}</pre>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 font-mono text-sm">
      {data.summary && (
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <HtmlContent html={data.summary} className="text-gray-900 dark:text-gray-100" />
        </div>
      )}

      {/* RAG Pipeline */}
      {data.rag_pipeline && (
        <Section title="🔍 RAG Pipeline" expanded={expanded} toggle={toggle} id="rag">
          <HtmlContent html={data.rag_pipeline.description} className="text-gray-700 dark:text-gray-300 mb-3" />
          {data.rag_pipeline.steps && data.rag_pipeline.steps.length > 0 && (
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {data.rag_pipeline.steps.map((step, idx) => (
                <li key={idx} className="[&>div]:inline">
                  <HtmlContent html={step} className="inline" />
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}

      {/* Multi-Agent Architecture */}
      {data.multi_agent_architecture && (
        <Section title="🤖 Multi-Agent Architecture" expanded={expanded} toggle={toggle} id="agents">
          {data.multi_agent_architecture.agents && data.multi_agent_architecture.agents.length > 0 && (
            <div className="space-y-2">
              {data.multi_agent_architecture.agents.map((agent, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-gray-100">{agent.name}</span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded text-xs">
                      {agent.execution}
                    </span>
                  </div>
                  <HtmlContent html={agent.role} className="text-xs text-gray-600 dark:text-gray-400 mt-1" />
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Model Details */}
      {data.model_details && (
        <Section title="⚙️ Model Details" expanded={expanded} toggle={toggle} id="model">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Model</p>
                <p className="font-bold text-gray-900 dark:text-gray-100">{data.model_details.llm_model}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Tokens</p>
                <p className="font-bold text-gray-900 dark:text-gray-100">{data.model_details.total_tokens}</p>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Data Flow Visualization */}
      {data.data_flow && (
        <Section title="📊 Data Flow" expanded={expanded} toggle={toggle} id="dataflow">
          {data.data_flow.mermaid_diagram && data.data_flow.mermaid_diagram.trim() !== '' && !data.data_flow.mermaid_diagram.includes('Optional') ? (
            <MermaidDiagram code={data.data_flow.mermaid_diagram} />
          ) : data.data_flow.description ? (
            <HtmlContent html={data.data_flow.description} className="text-gray-700 dark:text-gray-300" />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">No data flow visualization available</p>
          )}
        </Section>
      )}
    </div>
  )
}

// Collapsible Section Component
function Section({ title, children, expanded, toggle, id }) {
  const isExpanded = expanded.has(id)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-900">
          {children}
        </div>
      )}
    </div>
  )
}
