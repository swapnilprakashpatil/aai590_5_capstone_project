import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Heart,
  Lightbulb,
  ShoppingCart,
  TrendingUp,
  Cpu,
  Loader,
  ChevronDown,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const TAB_CONFIGS = [
  {
    id: 'nutritional_information',
    label: 'Nutritional Info',
    icon: Activity,
    color: 'blue',
  },
  {
    id: 'health_risks',
    label: 'Health Risks',
    icon: AlertTriangle,
    color: 'red',
  },
  {
    id: 'dietary_recommendations',
    label: 'Recommendations',
    icon: Heart,
    color: 'green',
  },
  {
    id: 'alternative_products',
    label: 'Alternatives',
    icon: ShoppingCart,
    color: 'purple',
  },
  {
    id: 'long_term_health',
    label: 'Long-Term Impact',
    icon: TrendingUp,
    color: 'orange',
  },
  {
    id: 'technical_agentic_analysis',
    label: 'Technical Analysis',
    icon: Cpu,
    color: 'gray',
  },
]

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    activeBg: 'bg-blue-500',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    activeBg: 'bg-red-500',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    activeBg: 'bg-green-500',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    activeBg: 'bg-purple-500',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    activeBg: 'bg-orange-500',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
    activeBg: 'bg-gray-500',
  },
}

function InsightTab({ config, isActive, onClick, hasError }) {
  const Icon = config.icon
  const colors = COLOR_CLASSES[config.color]

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
        ${isActive 
          ? `${colors.activeBg} text-white shadow-lg` 
          : `${colors.bg} ${colors.text} hover:shadow-md`
        }
        ${hasError ? 'opacity-50' : ''}
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm whitespace-nowrap">{config.label}</span>
      {hasError && (
        <AlertTriangle className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1" />
      )}
    </button>
  )
}

function InsightMetadata({ metadata }) {
  if (!metadata) return null

  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400 pb-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>{metadata.duration_seconds?.toFixed(2)}s</span>
      </div>
      <div className="flex items-center gap-1">
        <Cpu className="w-3 h-3" />
        <span>{metadata.model || 'Azure OpenAI'}</span>
      </div>
      <div className="flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        <span>{metadata.agent_name}</span>
      </div>
    </div>
  )
}

function MarkdownContent({ content }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-3" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />,
          code: ({ node, inline, ...props }) => 
            inline 
              ? <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm" {...props} />
              : <code className="block p-4 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-x-auto text-sm" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
          th: ({ node, ...props }) => <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold" {...props} />,
          td: ({ node, ...props }) => <td className="border border-gray-300 dark:border-gray-700 px-4 py-2" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 italic my-4 text-gray-700 dark:text-gray-300" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function HealthInsightsPanel({ insights, loading, error }) {
  const [activeTab, setActiveTab] = useState('nutritional_information')
  const [showAllMetadata, setShowAllMetadata] = useState(false)

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-primary-500" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          Generating personalized health insights...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Multiple AI agents are analyzing the product for you
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 border-2 border-red-300 dark:border-red-700">
        <div className="flex items-start gap-3 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-lg mb-2">Error Generating Insights</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!insights || !insights.insights) {
    return (
      <div className="card p-6 text-center text-gray-500 dark:text-gray-400">
        <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No insights available. Analyze a product to see personalized health information.</p>
      </div>
    )
  }

  const activeInsight = insights.insights[activeTab]
  const metadata = insights.metadata

  return (
    <div className="space-y-6">
      {/* Header with overall metadata */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary-500" />
              Personalized Health Insights
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AI-powered analysis using multi-agent RAG framework
            </p>
          </div>
          
          {metadata && (
            <button
              onClick={() => setShowAllMetadata(!showAllMetadata)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-500 transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>{metadata.total_duration_seconds?.toFixed(2)}s</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAllMetadata ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Expanded metadata */}
        <AnimatePresence>
          {showAllMetadata && metadata && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Agents:</span>
                  <span className="ml-2 font-semibold">{metadata.agent_count}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Started:</span>
                  <span className="ml-2 font-mono text-xs">
                    {new Date(metadata.start_time).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              {metadata.agents && (
                <div className="mt-4 space-y-2">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Agent Execution Times:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {metadata.agents.map((agent, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-gray-900 rounded px-3 py-2">
                        <span className="text-gray-700 dark:text-gray-300">{agent.agent_name}</span>
                        <span className="font-mono text-gray-500">{agent.duration_seconds?.toFixed(2)}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tab Navigation */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {TAB_CONFIGS.map(config => (
            <InsightTab
              key={config.id}
              config={config}
              isActive={activeTab === config.id}
              onClick={() => setActiveTab(config.id)}
              hasError={activeInsight?.error}
            />
          ))}
        </div>
      </div>

      {/* Active Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="card p-6"
        >
          {activeInsight ? (
            <div className="space-y-4">
              <InsightMetadata metadata={activeInsight.metadata} />
              
              {activeInsight.error ? (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-semibold mb-1">This insight encountered an error:</p>
                    <p>{activeInsight.error}</p>
                  </div>
                </div>
              ) : (
                <MarkdownContent content={activeInsight.content} />
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Loader className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>Loading insight...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default HealthInsightsPanel
