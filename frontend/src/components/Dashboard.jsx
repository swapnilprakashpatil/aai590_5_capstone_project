import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InsightRenderer } from './InsightRenderer'
import {
  Upload,
  Camera,
  Loader,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  FlaskConical,
  ShieldAlert,
  Info,
  RotateCcw,
  Sparkles,
  PencilLine,
  ZoomIn,
  X,
  Search,
  User,
  Heart,
  Activity,
  Plus,
  Calculator,
} from 'lucide-react'
import { analyzeLabel, extractNutrition, checkApiHealth, checkAIHealth, analyzeWithInsights, generateHealthInsights } from '../api'

// Nutrition field definitions
const CORE_FIELDS = [
  { key: 'energy_100g',        label: 'Energy (kJ)',          unit: 'kJ',   required: true,  placeholder: '1500', hint: 'Total energy per 100g/100ml in kilojoules. US labels show Calories: multiply cal × 4.184 to get kJ' },
  { key: 'fat_100g',           label: 'Total Fat',            unit: 'g',    required: true,  placeholder: '5.0' },
  { key: 'saturated_fat_100g', label: 'Saturated Fat',        unit: 'g',    required: true,  placeholder: '2.0' },
  { key: 'carbohydrates_100g', label: 'Carbohydrates',        unit: 'g',    required: true,  placeholder: '30.0' },
  { key: 'sugars_100g',        label: 'Sugars',               unit: 'g',    required: true,  placeholder: '10.0' },
  { key: 'fiber_100g',         label: 'Dietary Fiber',        unit: 'g',    required: true,  placeholder: '2.0' },
  { key: 'proteins_100g',      label: 'Protein',              unit: 'g',    required: true,  placeholder: '4.0' },
  { key: 'salt_100g',          label: 'Salt',                 unit: 'g',    required: true,  placeholder: '0.5' },
  { key: 'additives_n',        label: 'Number of Additives',  unit: '',     required: true,  placeholder: '0', hint: 'Count of E-number additives listed in ingredients' },
]

const ADVANCED_FIELDS = [
  { key: 'trans_fat_100g',           label: 'Trans Fat',              unit: 'g',   placeholder: '0.0' },
  { key: 'added_sugars_100g',        label: 'Added Sugars',           unit: 'g',   placeholder: '0.0' },
  { key: 'monounsaturated_fat_100g', label: 'Monounsaturated Fat',    unit: 'g',   placeholder: '0.0' },
  { key: 'polyunsaturated_fat_100g', label: 'Polyunsaturated Fat',    unit: 'g',   placeholder: '0.0' },
  { key: 'starch_100g',              label: 'Starch',                 unit: 'g',   placeholder: '0.0' },
  { key: 'nutriscore_score',         label: 'Nutri-Score (raw score)', unit: '',   placeholder: '0', hint: 'Nutri-Score numeric value (−15 to +40). Leave 0 if unknown.' },
]

const DEFAULT_VALUES = {
  ...Object.fromEntries(
    [...CORE_FIELDS, ...ADVANCED_FIELDS].map(f => [f.key, ''])
  ),
  additives_n: '0', // Default to 0 since most labels don't list additives count
}

// NOVA colour helpers
const NOVA_BG   = { 1: 'bg-emerald-500', 2: 'bg-blue-500',   3: 'bg-amber-500',  4: 'bg-red-500'   }
const NOVA_TEXT = { 1: 'text-emerald-600', 2: 'text-blue-600', 3: 'text-amber-600', 4: 'text-red-600' }
const NOVA_BORDER = { 1: 'border-emerald-400', 2: 'border-blue-400', 3: 'border-amber-400', 4: 'border-red-400' }

const NUTRISCORE_BG = { A:'bg-emerald-500', B:'bg-lime-500', C:'bg-yellow-400', D:'bg-orange-500', E:'bg-red-600' }

// NOVA Classification Information
const NOVA_INFO = [
  {
    group: 1,
    title: 'Unprocessed or Minimally Processed',
    color: 'emerald',
    description: 'Natural foods obtained directly from plants or animals with no added substances.',
    examples: 'Fresh fruits, vegetables, eggs, meat, fish, milk, nuts, legumes, grains',
    details: 'These are the edible parts of plants (seeds, fruits, leaves, stems, roots) or from animals (muscle, offal, eggs, milk), after minimal processing like removal of inedible parts, drying, crushing, grinding, fractioning, filtering, roasting, boiling, pasteurization, refrigeration, freezing, or other methods that do not add substances.',
  },
  {
    group: 2,
    title: 'Processed Culinary Ingredients',
    color: 'blue',
    description: 'Substances extracted from Group 1 foods or from nature, used in cooking.',
    examples: 'Oils, butter, sugar, salt, honey, vinegar, starches',
    details: 'These are substances obtained directly from Group 1 foods or from nature by processes that include pressing, refining, grinding, milling, and drying. They are used in homes and restaurants to prepare, season and cook Group 1 foods.',
  },
  {
    group: 3,
    title: 'Processed Foods',
    color: 'amber',
    description: 'Products made by adding Group 2 ingredients to Group 1 foods.',
    examples: 'Canned vegetables, cheese, fresh bread, cured meat, wine, beer',
    details: 'These are relatively simple products made by adding sugar, oil, salt or other Group 2 ingredients to Group 1 foods. Most have two or three ingredients. Processes include various preservation or cooking methods, and, in the case of breads and cheese, non-alcoholic fermentation.',
  },
  {
    group: 4,
    title: 'Ultra-Processed Foods',
    color: 'red',
    description: 'Industrial formulations typically with 5 or more ingredients and various additives.',
    examples: 'Soft drinks, packaged snacks, instant noodles, mass-produced bread, cookies, ice cream, processed meats',
    details: 'Ultra-processed foods are industrial formulations made mostly or entirely from substances extracted from foods (oils, fats, sugar, starch, proteins), derived from food constituents (hydrogenated fats, modified starch), or synthesized from other organic substances. They often contain little or no whole food and include additives (preservatives, stabilizers, emulsifiers, sweeteners, colorants, flavors).',
  },
]

// Sub-components

function NutritionField({ field, value, onChange, autoDetected = false, originalValue = null }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
        {field.unit && <span className="text-gray-400 font-normal">({field.unit})</span>}
        {autoDetected && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
            <Sparkles className="w-2.5 h-2.5" /> OCR
          </span>
        )}
        {field.hint && (
          <span className="group relative cursor-default">
            <Info className="w-3 h-3 text-gray-400" />
            <span className="absolute left-4 top-0 z-10 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded p-2 shadow-lg">
              {field.hint}
            </span>
          </span>
        )}
      </label>
      <input
        type="number"
        step="any"
        min="0"
        placeholder={field.placeholder}
        value={value}
        onChange={e => onChange(field.key, e.target.value)}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          transition-colors
          ${autoDetected
            ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/10'
            : 'border-gray-300 dark:border-gray-600'
          }
        `}
        required={field.required}
      />
      {originalValue && (
        <span className="text-[10px] text-blue-600 dark:text-blue-400 italic">
          From label: {originalValue}{field.unit && ` ${field.unit}`} {field.key !== 'additives_n' && '(per serving)'}
          {field.key === 'energy_100g' && ` = ${Math.round(originalValue / 4.184)} cal`}
        </span>
      )}
    </div>
  )
}

// ImageMagnifier component with hover magnification and click-to-zoom
function ImageMagnifier({ src, alt = '', className = '', maxHeight = 288 }) {
  const [showMagnifier, setShowMagnifier] = useState(false)
  const [magnifierEnabled, setMagnifierEnabled] = useState(true)
  const [showZoomModal, setShowZoomModal] = useState(false)
  const [[x, y], setXY] = useState([0, 0])
  const [[imgWidth, imgHeight], setSize] = useState([0, 0])
  const [mouseOnImage, setMouseOnImage] = useState(false)

  const magnifierSize = 150
  const zoomLevel = 2.5

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showZoomModal) {
        setShowZoomModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showZoomModal])

  // Early return if no src provided (after all hooks to comply with Rules of Hooks)
  if (!src) {
    return null
  }

  const handleMouseEnter = (e) => {
    const elem = e.currentTarget
    const { width, height } = elem.getBoundingClientRect()
    setSize([width, height])
    setMouseOnImage(true)
  }

  const handleMouseMove = (e) => {
    const elem = e.currentTarget
    const { top, left } = elem.getBoundingClientRect()
    const x = e.clientX - left
    const y = e.clientY - top
    setXY([x, y])
  }

  const handleMouseLeave = () => {
    setMouseOnImage(false)
  }

  const handleImageClick = () => {
    if (!magnifierEnabled) {
      setShowZoomModal(true)
    }
  }

  return (
    <div className="space-y-2">
      {/* Control buttons */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setMagnifierEnabled(!magnifierEnabled)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            magnifierEnabled
              ? 'bg-primary-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Magnifier {magnifierEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={() => setShowZoomModal(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-1.5"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          Full Zoom
        </button>
      </div>

      {/* Image container */}
      <div className="card overflow-hidden relative">
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleImageClick}
          style={{ cursor: magnifierEnabled ? 'none' : 'zoom-in' }}
        >
          <img
            src={src}
            alt={alt}
            style={{ maxHeight: `${maxHeight}px` }}
            className={`w-full object-contain bg-gray-50 dark:bg-gray-800 ${className || ''}`}
          />

          {/* Magnifier lens */}
          {magnifierEnabled && mouseOnImage && (
            <div
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                height: `${magnifierSize}px`,
                width: `${magnifierSize}px`,
                top: `${y - magnifierSize / 2}px`,
                left: `${x - magnifierSize / 2}px`,
                opacity: '1',
                border: '3px solid #3b82f6',
                backgroundColor: 'white',
                backgroundImage: `url('${src}')`,
                backgroundRepeat: 'no-repeat',
                borderRadius: '50%',
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
                backgroundPositionX: `${-x * zoomLevel + magnifierSize / 2}px`,
                backgroundPositionY: `${-y * zoomLevel + magnifierSize / 2}px`,
              }}
            />
          )}

          {/* Crosshair when magnifier is on */}
          {magnifierEnabled && mouseOnImage && (
            <div
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                top: `${y}px`,
                left: `${x}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-0.5 h-4 bg-primary-500 absolute -top-6 left-1/2 -translate-x-1/2" />
              <div className="w-0.5 h-4 bg-primary-500 absolute top-2 left-1/2 -translate-x-1/2" />
              <div className="h-0.5 w-4 bg-primary-500 absolute top-1/2 -translate-y-1/2 -left-6" />
              <div className="h-0.5 w-4 bg-primary-500 absolute top-1/2 -translate-y-1/2 left-2" />
            </div>
          )}
        </div>

        {/* Hint overlay when magnifier is off */}
        {!magnifierEnabled && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all flex items-center justify-center pointer-events-none">
            <div className="opacity-0 hover:opacity-100 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-opacity flex items-center gap-2 shadow-lg">
              <ZoomIn className="w-4 h-4" /> Click to zoom
            </div>
          </div>
        )}
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {showZoomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowZoomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-6xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowZoomModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-2"
              >
                <X className="w-6 h-6" />
                <span className="text-sm">Close (Esc)</span>
              </button>
              <div className="bg-white dark:bg-gray-900 rounded-lg overflow-auto max-h-[90vh] shadow-2xl">
                <img
                  src={src}
                  alt={`${alt} (zoomed)`}
                  className="w-full h-auto"
                  style={{ maxHeight: '85vh' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ScoreMeter({ label, value, maxValue, color }) {
  const pct = Math.min(100, (value / maxValue) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{label}</span>
        <span className="font-mono font-semibold">{value.toFixed(4)}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

function ResultsPanel({ result, imagePreview, productName, onReset }) {
  // Handle both old format (flat) and new format (with analysis wrapper)
  const analysis = result.analysis || result
  const healthInsights = result.health_insights
  
  const { nova_group, nova_description, nova_confidence, nutriscore_grade, anomaly, nutrition_per_100g } = analysis
  
  const [activeInsightTab, setActiveInsightTab] = useState('nutritional_information')

  // Health insight tabs configuration
  const insightTabs = [
    { id: 'nutritional_information', label: 'Nutrition Analysis', icon: '🔬' },
    { id: 'health_risks', label: 'Health Risks', icon: '⚠️' },
    { id: 'dietary_recommendations', label: 'Recommendations', icon: '🥗' },
    { id: 'alternative_products', label: 'Alternatives', icon: '🔄' },
    { id: 'long_term_health', label: 'Long-term Impact', icon: '📈' },
    { id: 'technical_agentic_analysis', label: 'Technical Analysis', icon: '🤖' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Analysis Results</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-powered nutritional assessment complete</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Scan New
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — image + grade badges */}
        <div className="space-y-4">
          {imagePreview && (
            <div className="space-y-2">
              {/* Product name badge */}
              {productName && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white px-4 py-2.5 rounded-xl shadow-lg">
                  <Sparkles className="w-5 h-5 flex-shrink-0" />
                  <p className="font-bold text-sm line-clamp-1 flex-1">{productName}</p>
                </div>
              )}
              <ImageMagnifier 
                src={imagePreview} 
                alt={productName || "Food label"} 
                maxHeight={320}
              />
            </div>
          )}

          {/* Nutri-Score badge */}
          <div className="card p-4 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${NUTRISCORE_BG[nutriscore_grade] || 'bg-gray-400'} flex items-center justify-center shadow-lg`}>
              <span className="text-2xl font-black text-white">{nutriscore_grade}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Nutri-Score Grade</p>
              <p className="font-bold text-gray-800 dark:text-gray-100">Grade {nutriscore_grade}</p>
            </div>
          </div>
        </div>

        {/* Middle — NOVA + anomaly */}
        <div className="lg:col-span-2 space-y-4">
          {/* NOVA Classification */}
          <div className={`card p-6 border-2 ${NOVA_BORDER[nova_group]}`}>
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl ${NOVA_BG[nova_group]} flex items-center justify-center shadow-lg flex-shrink-0`}>
                <span className="text-3xl font-black text-white">{nova_group}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">NOVA Group</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-opacity-20 ${NOVA_TEXT[nova_group]} ${NOVA_BG[nova_group].replace('bg-', 'bg-opacity-10 bg-')}`}>
                    {nova_confidence}% confidence
                  </span>
                </div>
                <h3 className={`text-xl font-bold ${NOVA_TEXT[nova_group]} mb-1`}>
                  NOVA {nova_group} — {['Unprocessed', 'Processed Ingredient', 'Processed', 'Ultra-Processed'][nova_group - 1]}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{nova_description}</p>
              </div>
            </div>

            {/* NOVA confidence bar */}
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Model confidence</span>
                <span className="font-semibold">{nova_confidence}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${nova_confidence}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className={`h-full rounded-full ${NOVA_BG[nova_group]}`}
                />
              </div>
            </div>
          </div>

          {/* Anomaly Detection */}
          <div className={`card p-6 border-2 ${anomaly.is_anomalous ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'}`}>
            <div className="flex items-start gap-3 mb-4">
              {anomaly.is_anomalous ? (
                <ShieldAlert className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className={`font-bold text-lg ${anomaly.is_anomalous ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {anomaly.is_anomalous ? 'Anomaly Detected' : 'Within Normal Range'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {anomaly.votes}/3 detectors flagged this product •{' '}
                  Ensemble score: <strong>{anomaly.ensemble_score}%</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <ScoreMeter label="Autoencoder" value={anomaly.ae_score} maxValue={1} color={anomaly.is_anomalous ? 'bg-red-500' : 'bg-emerald-500'} />
              <ScoreMeter label="Isolation Forest" value={anomaly.if_score} maxValue={Math.max(1, anomaly.if_score * 1.5)} color="bg-amber-500" />
              <ScoreMeter label="One-Class SVM" value={anomaly.svm_score} maxValue={Math.max(1, anomaly.svm_score * 1.5)} color="bg-violet-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Nutrition breakdown */}
      <div className="card p-6">
        <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary-500" />
          Nutrition Facts (per 100g / 100ml)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Energy', value: `${nutrition_per_100g.energy_kcal} kcal`, sub: `${nutrition_per_100g.energy_kj} kJ` },
            { label: 'Fat', value: `${nutrition_per_100g.fat}g` },
            { label: 'Saturated Fat', value: `${nutrition_per_100g.saturated_fat}g` },
            { label: 'Carbohydrates', value: `${nutrition_per_100g.carbohydrates}g` },
            { label: 'Sugars', value: `${nutrition_per_100g.sugars}g` },
            { label: 'Fibre', value: `${nutrition_per_100g.fiber}g` },
            { label: 'Protein', value: `${nutrition_per_100g.proteins}g` },
            { label: 'Salt', value: `${nutrition_per_100g.salt}g` },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
              <p className="font-bold text-gray-800 dark:text-gray-100">{item.value}</p>
              {item.sub && <p className="text-xs text-gray-400">{item.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Health Insights Section */}
      {(healthInsights !== undefined) && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-6 h-6 text-red-500" />
            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-xl">
              Personalized Health Insights
            </h4>
          </div>
          
          {healthInsights === null ? (
            // Loading state
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader className="w-12 h-12 animate-spin text-primary-600" />
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Generating AI-powered health insights...<br />
                <span className="text-sm">6 specialized agents are analyzing your food. This takes 30-40 seconds.</span>
              </p>
            </div>
          ) : healthInsights.error ? (
            // Error state
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <p className="text-red-700 dark:text-red-400">
                Failed to generate health insights: {healthInsights.error}
              </p>
            </div>
          ) : (
            // Success state
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                AI-powered analysis tailored to your health profile • Generated in {healthInsights.metadata?.total_duration_seconds?.toFixed(1)}s by {healthInsights.metadata?.agent_count} specialized agents
              </p>

              {/* Insight Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
                {insightTabs.map(tab => {
                  const insight = healthInsights.insights?.[tab.id]
                  if (!insight || insight.error) return null
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInsightTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        activeInsightTab === tab.id
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Active Insight Content */}
              {healthInsights.insights?.[activeInsightTab] && !healthInsights.insights[activeInsightTab].error && (
            <motion.div
              key={activeInsightTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <InsightRenderer 
                data={healthInsights.insights[activeInsightTab].data}
                content={healthInsights.insights[activeInsightTab].content}
                agentType={activeInsightTab}
              />
              
              {/* Metadata */}
              {healthInsights.insights[activeInsightTab].metadata && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>⚡ Generated in {healthInsights.insights[activeInsightTab].metadata.duration_seconds?.toFixed(2)}s</span>
                  <span>🔤 {healthInsights.insights[activeInsightTab].metadata.prompt_tokens + healthInsights.insights[activeInsightTab].metadata.completion_tokens} tokens</span>
                  <span>🤖 {healthInsights.insights[activeInsightTab].metadata.model}</span>
                </div>
              )}
            </motion.div>
          )}
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Main Dashboard

// Default demo profile (matches Profile.jsx)
const DEFAULT_DEMO_PROFILE = {
  name: 'Alex Morgan',
  age: '35',
  height: '69', // inches (175 cm)
  weight: '165', // lbs (75 kg)
  gender: 'male',
  activityLevel: 'moderate',
  medicalConditions: ['Hypertension', 'Type 2 Diabetes'],
  allergies: ['Peanuts', 'Shellfish'],
  dietaryPreferences: ['Low Sodium', 'High Fiber'],
  healthGoals: 'Manage blood sugar levels and reduce sodium intake for better cardiovascular health',
}

const Dashboard = () => {
  // steps: 'upload' | 'extracting' | 'form' | 'analyzing' | 'results'
  const [step, setStep] = useState('upload')
  const [uploadMode, setUploadMode] = useState('sample') // 'upload' or 'sample'
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [nutrition, setNutrition] = useState(DEFAULT_VALUES)
  const [autoFields, setAutoFields] = useState({})    // fields detected by OCR
  const [ocrFieldCount, setOcrFieldCount] = useState(0)
  const [ocrOriginalValues, setOcrOriginalValues] = useState({})  // original OCR values before conversion
  const [ocrServingSize, setOcrServingSize] = useState(null)      // serving size detected by OCR
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [ocrError, setOcrError] = useState(false)
  const [analysisError, setAnalysisError] = useState(false)
  const [selectedProductName, setSelectedProductName] = useState('')
  const [showingLabel, setShowingLabel] = useState(false)
  const [reviewTab, setReviewTab] = useState('nutrition') // 'nutrition' or 'profile'
  const [userProfile, setUserProfile] = useState(null)
  const [apiStatus, setApiStatus] = useState('checking') // 'online' | 'offline' | 'checking'
  const [aiStatus, setAiStatus] = useState('checking') // 'online' | 'offline' | 'checking'
  const [aiModel, setAiModel] = useState('AI Model')
  const [showHealthInsights, setShowHealthInsights] = useState(true) // Toggle for health insights
  const fileInputRef = useRef(null)

  // Load user profile from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile')
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile))
      } catch (e) {
        console.error('Failed to load profile:', e)
        setUserProfile(DEFAULT_DEMO_PROFILE)
      }
    } else {
      // Use demo profile if none saved
      setUserProfile(DEFAULT_DEMO_PROFILE)
    }
  }, [])

  // Reload profile when navigating to form step (in case it was updated)
  useEffect(() => {
    if (step === 'form') {
      const savedProfile = localStorage.getItem('userProfile')
      if (savedProfile) {
        try {
          setUserProfile(JSON.parse(savedProfile))
        } catch (e) {
          console.error('Failed to reload profile:', e)
          setUserProfile(DEFAULT_DEMO_PROFILE)
        }
      } else {
        // Use demo profile if none saved
        setUserProfile(DEFAULT_DEMO_PROFILE)
      }
    }
  }, [step])

  // Check API health status
  useEffect(() => {
    const checkStatus = async () => {
      const isOnline = await checkApiHealth()
      setApiStatus(isOnline ? 'online' : 'offline')
    }
    
    checkStatus() // Initial check
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Check AI model health status
  useEffect(() => {
    const checkAIStatus = async () => {
      const result = await checkAIHealth()
      if (result.status === 'ok') {
        setAiStatus('online')
        setAiModel('AI Agent')
      } else {
        setAiStatus('offline')
        setAiModel('AI Agent')
      }
    }
    
    checkAIStatus() // Initial check
    const interval = setInterval(checkAIStatus, 60000) // Check every 60 seconds (less frequent due to cost)
    return () => clearInterval(interval)
  }, [])

  // Sample product data with image pairs
  const PRODUCT_FILENAMES = [
    '1-Doritos-Nacho-Cheese-Tortilla-Snack-Chips-Party-Size-14-5-Ounce-Bag.avif',
    '2-Coca Cola.webp',
    '3-Perdue-No-Antibiotics-Ever-Fresh-Chicken-Breast-Tenderloins-1-2-lb-Tray.avif',
    '4-Maruchan-Ramen-Noodle-Creamy-Chicken-Flavor-Soup-3-oz-Shelf-Stable-Package.avif',
    '5-Barley.webp',
    '6-Fischers-Honey-24oz-Raw-and-Unfiltered-Local-100-US-Grade-A-Squeeze-Bottle.avif',
    '7-Great-Value-Whole-Vitamin-D-Milk-Gallon-Plastic.avif',
    '8-Heinz-Tomato-Ketchup-20-oz-Bottle.avif',
    '9-Lakewood-Organic-Pure-Orange-Juice-32-fl-oz-Pack-of-2.avif',
    '10-Turkey-Hill-Moose-Tracks-Premium-Ice-Cream-46-fl-oz.avif',
    '11-Velveeta-Slices-Original-Cheese-24-Ct-Pk.avif',
    '12-Great-Value-Frozen-Sweet-Peas-12-oz-Steamable-Bag.avif',
  ]

  const SAMPLE_IMAGES = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    labelUrl: `${import.meta.env.BASE_URL}labels/label/${i + 1}.webp`,
    productUrl: `${import.meta.env.BASE_URL}labels/product/${PRODUCT_FILENAMES[i]}`,
    name: [
      'Doritos Nacho Cheese',
      'Coca Cola', 
      'Perdue Chicken Breast',
      'Maruchan Ramen',
      'Barley',
      'Fischers Honey',
      'Great Value Whole Milk',
      'Heinz Ketchup',
      'Lakewood Orange Juice',
      'Turkey Hill Ice Cream',
      'Velveeta Cheese Slices',
      'Great Value Sweet Peas'
    ][i],
  }))

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) acceptImage(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) acceptImage(file)
  }

  const acceptImage = async (file) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError(null)
    setOcrError(false)
    setSelectedProductName('') // Clear product name for uploaded images
    setShowingLabel(true) // Show label directly for uploaded images (no product image pair)
    setStep('extracting')

    try {
      const ocr = await extractNutrition(file)
      // Pre-fill form with extracted values; keep empty string for missed fields
      const prefilled = { ...DEFAULT_VALUES }
      if (ocr.extracted) {
        Object.entries(ocr.extracted).forEach(([k, v]) => {
          prefilled[k] = String(v)
        })
      }
      setNutrition(prefilled)
      setAutoFields(ocr.auto_fields || {})
      setOcrFieldCount(ocr.fields_found || 0)
      setOcrOriginalValues(ocr.original_values || {})
      setOcrServingSize(ocr.serving_size_g || null)
      // Expand advanced section if OCR found any advanced fields
      const advancedKeys = ADVANCED_FIELDS.map(f => f.key)
      if (advancedKeys.some(k => ocr.auto_fields?.[k])) setShowAdvanced(true)
      setStep('form')
    } catch (err) {
      // OCR failed — show error with retry option
      setOcrError(true)
      setError(`OCR extraction failed: ${err.message || 'Network error'}. You can retry or enter values manually.`)
      setAutoFields({})
      setOcrFieldCount(0)
      setStep('form')
    }
  }

  const handleSampleImageSelect = async (sample) => {
    setError(null)
    setOcrError(false)
    setSelectedProductName(sample.name)
    setShowingLabel(false)
    setStep('extracting')

    // Start with product image, then flip to label after 1.5 seconds
    // (OCR is instant for sample images, so shorter delay)
    setTimeout(() => {
      setShowingLabel(true)
    }, 1500)

    try {
      // Fetch the label image (for OCR) and convert to File object
      const response = await fetch(sample.labelUrl)
      const blob = await response.blob()
      const filename = sample.labelUrl.split('/').pop()
      const file = new File([blob], filename, { type: blob.type })
      
      setImageFile(file)
      setImagePreview(sample.labelUrl)

      // Run OCR on the label image
      const ocr = await extractNutrition(file)
      const prefilled = { ...DEFAULT_VALUES }
      if (ocr.extracted) {
        Object.entries(ocr.extracted).forEach(([k, v]) => {
          prefilled[k] = String(v)
        })
      }
      setNutrition(prefilled)
      setAutoFields(ocr.auto_fields || {})
      setOcrFieldCount(ocr.fields_found || 0)
      setOcrOriginalValues(ocr.original_values || {})
      setOcrServingSize(ocr.serving_size_g || null)
      
      const advancedKeys = ADVANCED_FIELDS.map(f => f.key)
      if (advancedKeys.some(k => ocr.auto_fields?.[k])) setShowAdvanced(true)
      setStep('form')
    } catch (err) {
      setOcrError(true)
      setError(`OCR extraction failed: ${err.message || 'Network error'}. You can retry or enter values manually.`)
      setAutoFields({})
      setOcrFieldCount(0)
      setStep('form')
    }
  }

  const handleRetryOcr = async () => {
    if (!imageFile) return
    
    setError(null)
    setOcrError(false)
    setStep('extracting')

    try {
      const ocr = await extractNutrition(imageFile)
      const prefilled = { ...DEFAULT_VALUES }
      if (ocr.extracted) {
        Object.entries(ocr.extracted).forEach(([k, v]) => {
          prefilled[k] = String(v)
        })
      }
      setNutrition(prefilled)
      setAutoFields(ocr.auto_fields || {})
      setOcrFieldCount(ocr.fields_found || 0)
      setOcrOriginalValues(ocr.original_values || {})
      setOcrServingSize(ocr.serving_size_g || null)
      
      const advancedKeys = ADVANCED_FIELDS.map(f => f.key)
      if (advancedKeys.some(k => ocr.auto_fields?.[k])) setShowAdvanced(true)
      setStep('form')
    } catch (err) {
      setOcrError(true)
      setError(`OCR extraction failed again: ${err.message || 'Network error'}. Please enter values manually.`)
      setAutoFields({})
      setOcrFieldCount(0)
      setStep('form')
    }
  }

  const handleFieldChange = (key, value) => {
    setNutrition(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate required fields
    const missing = CORE_FIELDS.filter(f => f.required && (nutrition[f.key] === '' || nutrition[f.key] == null))
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map(f => f.label).join(', ')}`)
      return
    }

    setStep('analyzing')
    setError(null)
    setAnalysisError(false)

    // Convert all nutrition values to numbers, defaulting blanks to 0
    const numericNutrition = Object.fromEntries(
      [...CORE_FIELDS, ...ADVANCED_FIELDS].map(f => [f.key, parseFloat(nutrition[f.key]) || 0])
    )

    try {
      // Step 1: Get NOVA classification and anomaly detection (fast)
      const analysisData = await analyzeLabel(imageFile, numericNutrition)
      
      // Show NOVA results immediately
      // Set health_insights to null (loading) if enabled, undefined if disabled
      setResult({ 
        analysis: analysisData, 
        health_insights: showHealthInsights ? null : undefined 
      })
      setStep('results')
      
      // Step 2: Generate AI health insights (slow, 30-40s) - only if checkbox is checked
      if (showHealthInsights) {
        try {
          const insights = await generateHealthInsights(
            analysisData,
            userProfile || DEFAULT_DEMO_PROFILE,
            selectedProductName || imageFile.name
          )
          
          // Merge health insights into results
          setResult(prev => ({ ...prev, health_insights: insights }))
        } catch (insightErr) {
          console.error('Failed to generate health insights:', insightErr)
          // NOVA results are still shown, just no health insights
          setResult(prev => ({
            ...prev,
            health_insights: {
              error: insightErr.message,
              insights: {}
            }
          }))
        }
      }
    } catch (err) {
      setAnalysisError(true)
      setError(`Analysis failed: ${err.message}`)
      setStep('form')
    }
  }

  const handleRetryAnalysis = async () => {
    if (!imageFile) return
    
    setError(null)
    setAnalysisError(false)
    setStep('analyzing')

    // Convert all nutrition values to numbers, defaulting blanks to 0
    const numericNutrition = Object.fromEntries(
      [...CORE_FIELDS, ...ADVANCED_FIELDS].map(f => [f.key, parseFloat(nutrition[f.key]) || 0])
    )

    try {
      // Step 1: Get NOVA classification and anomaly detection (fast)
      const analysisData = await analyzeLabel(imageFile, numericNutrition)
      
      // Show NOVA results immediately
      // Set health_insights to null (loading) if enabled, undefined if disabled
      setResult({ 
        analysis: analysisData, 
        health_insights: showHealthInsights ? null : undefined 
      })
      setStep('results')
      
      // Step 2: Generate AI health insights (slow, 30-40s) - only if checkbox is checked
      if (showHealthInsights) {
        try {
          const insights = await generateHealthInsights(
            analysisData,
            userProfile || DEFAULT_DEMO_PROFILE,
            selectedProductName || imageFile.name
          )
          
          // Merge health insights into results
          setResult(prev => ({ ...prev, health_insights: insights }))
        } catch (insightErr) {
          console.error('Failed to generate health insights:', insightErr)
          // NOVA results are still shown, just no health insights
          setResult(prev => ({
            ...prev,
            health_insights: {
              error: insightErr.message,
              insights: {}
            }
          }))
        }
      }
    } catch (err) {
      setAnalysisError(true)
      setError(`Analysis failed again: ${err.message}. Please check your nutrition values or try a different image.`)
      setStep('form')
    }
  }

  const handleReset = () => {
    setStep('upload')
    setImageFile(null)
    setImagePreview(null)
    setNutrition(DEFAULT_VALUES)
    setAutoFields({})
    setOcrFieldCount(0)
    setResult(null)
    setError(null)
    setShowAdvanced(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Render helpers

  const STEPS = [
    { id: 'upload',     label: '1. Upload' },
    { id: 'extracting', label: '2. OCR Scan' },
    { id: 'form',       label: '3. Review' },
    { id: 'results',    label: '4. Results' },
  ]

  const stepIndex = (id) => STEPS.findIndex(s => s.id === id)
  const activeIdx = stepIndex(step === 'analyzing' ? 'form' : step)

  const StepIndicator = () => {
    // Step icons mapping
    const stepIcons = {
      upload: Upload,
      extracting: Search,
      form: PencilLine,
      results: Sparkles,
    }

    return (
      <div className="mb-8">
        <div className="relative">
          {/* Progress line background */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700" 
               style={{ marginLeft: '2rem', marginRight: '2rem' }} />
          
          {/* Progress line filled */}
          <div 
            className="absolute top-5 left-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500 ease-out"
            style={{ 
              marginLeft: '2rem',
              width: `calc(${(activeIdx / (STEPS.length - 1)) * 100}% - ${activeIdx === 0 ? 2 : 4}rem)`
            }} 
          />
          
          {/* Steps */}
          <div className="relative flex justify-between">
            {STEPS.map((s, i) => {
              const isActive = i === activeIdx
              const isCompleted = i < activeIdx
              const StepIcon = stepIcons[s.id]
              
              return (
                <div key={s.id} className="flex flex-col items-center" style={{ flex: 1 }}>
                  {/* Step circle */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                      border-4 transition-all duration-300 relative z-10
                      ${isActive 
                        ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/50' 
                        : isCompleted
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : StepIcon ? (
                      <StepIcon className="w-5 h-5" />
                    ) : null}
                  </motion.div>
                  
                  {/* Step label */}
                  <div className="mt-3 text-center">
                    <p className={`text-sm font-semibold transition-colors ${
                      isActive 
                        ? 'text-primary-600 dark:text-primary-400' 
                        : isCompleted
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {s.label.split('. ')[1] || s.label}
                    </p>
                    {isActive && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-0.5 bg-primary-600 dark:bg-primary-400 mt-1 rounded-full"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page title */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2 leading-tight">
          Analyse Your{' '}
          <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Food Label
          </span>
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300 mb-3">
          Upload a food label photo and the AI reads the nutrition facts automatically and classifies the product.
        </p>
        
        {/* Status Indicators */}
        <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
          {/* API Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {apiStatus === 'checking' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Checking API...</span>
              </>
            ) : apiStatus === 'online' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">API Online</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-700 dark:text-red-400">API Offline</span>
              </>
            )}
          </div>
          
          {/* AI Model Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {aiStatus === 'checking' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Checking AI...</span>
              </>
            ) : aiStatus === 'online' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{aiModel} Online</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-700 dark:text-red-400">AI Offline</span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <StepIndicator />

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            {(ocrError || analysisError) && (
              <button
                onClick={ocrError ? handleRetryOcr : handleRetryAnalysis}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry {ocrError ? 'OCR' : 'Analysis'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 1: Upload */}
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUploadMode('upload')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  uploadMode === 'upload'
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Upload className="w-5 h-5 inline mr-2" />
                Upload Image
              </button>
              <button
                onClick={() => setUploadMode('sample')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  uploadMode === 'sample'
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Camera className="w-5 h-5 inline mr-2" />
                Try Sample
              </button>
            </div>

            {/* Upload Section */}
            {uploadMode === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  card p-12 text-center cursor-pointer transition-all duration-300 select-none
                  ${isDragging
                    ? 'border-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-105'
                    : 'border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                `}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full mb-6 shadow-lg mx-auto">
                  {isDragging ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Upload className="w-12 h-12 text-white" />
                    </motion.div>
                  ) : (
                    <Camera className="w-12 h-12 text-white" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {isDragging ? 'Drop your label here!' : 'Upload Food Label'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Drag & drop or click to browse — JPG, PNG, WEBP</p>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary mx-auto" type="button">
                  <Upload className="w-5 h-5 mr-2 inline" /> Choose Photo
                </motion.button>
              </div>
            )}

            {/* Sample Images Section */}
            {uploadMode === 'sample' && (
              <div className="card p-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
                  Select a Sample Food Label
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {SAMPLE_IMAGES.map((sample) => (
                    <motion.div
                      key={sample.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSampleImageSelect(sample)}
                      className="cursor-pointer group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 group-hover:border-primary-500 transition-all shadow-sm group-hover:shadow-lg">
                        <img
                          src={sample.labelUrl}
                          alt={sample.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-semibold transition-opacity">
                            Select
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 px-2 py-1.5 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 rounded-lg border border-primary-200 dark:border-primary-700 shadow-sm">
                        <div className="flex items-center justify-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                          <p className="text-xs font-medium text-primary-900 dark:text-primary-100 truncate">
                            {sample.name}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="card p-5 mt-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-500" /> Tips for Best Results
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <li>• Photograph the <strong>Nutrition Facts</strong> panel clearly</li>
                <li>• Ensure all text is readable and well-lit</li>
                <li>• Include the <strong>ingredients list</strong> for the additive count</li>
                <li>• Values are <strong>auto-extracted</strong> — review before submitting</li>
              </ul>

              {/* NOVA Classification Info */}
              <div className="mt-6 pt-6 border-t border-primary-200 dark:border-primary-700">
                <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary-600" />
                  NOVA Classification System
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Classification of foods based on their <strong>distance from nature</strong>
                </p>

                {/* NOVA Image */}
                <div className="mb-5 rounded-lg overflow-hidden bg-white dark:bg-gray-800 p-4">
                  <img 
                    src={`${import.meta.env.BASE_URL}nova-classification.png`}
                    alt="NOVA Classification 4 Groups" 
                    className="w-full h-auto rounded-lg"
                  />
                </div>

                {/* NOVA Groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {NOVA_INFO.map((nova) => {
                    const colorClasses = {
                      emerald: {
                        border: 'border-l-4 border-emerald-500',
                        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                        badge: 'bg-emerald-500 text-white',
                      },
                      blue: {
                        border: 'border-l-4 border-blue-500',
                        bg: 'bg-blue-50 dark:bg-blue-900/20',
                        badge: 'bg-blue-500 text-white',
                      },
                      amber: {
                        border: 'border-l-4 border-amber-500',
                        bg: 'bg-amber-50 dark:bg-amber-900/20',
                        badge: 'bg-amber-500 text-white',
                      },
                      red: {
                        border: 'border-l-4 border-red-500',
                        bg: 'bg-red-50 dark:bg-red-900/20',
                        badge: 'bg-red-500 text-white',
                      },
                    }
                    const colors = colorClasses[nova.color]
                    
                    return (
                      <div
                        key={nova.group}
                        className={`${colors.border} ${colors.bg} p-3 rounded-lg`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`${colors.badge} w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                            {nova.group}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-1">
                              {nova.title}
                            </h5>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {nova.description}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              <strong>Examples:</strong> {nova.examples}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Health Impact Note */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>💡 Health Impact:</strong> Research suggests that Group 1 and 2 foods are associated with better health outcomes,
                    while Group 4 (ultra-processed) foods have been linked to increased risk of obesity, cardiovascular disease, and other health conditions
                    when consumed in excess.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: OCR extracting with animated transition */}
        {step === 'extracting' && (
          <motion.div
            key="extracting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card p-12 flex flex-col items-center gap-6 text-center"
          >
            <div className="relative w-64 h-64" style={{ perspective: '1000px' }}>
              {/* Image container with flip animation (only for sample products with product images) */}
              <div className="relative w-full h-full">
                {selectedProductName ? (
                  // Sample product: show flip animation from product to label
                  <AnimatePresence mode="wait">
                    {showingLabel ? (
                      <motion.div
                        key="label"
                        initial={{ opacity: 0, rotateY: -90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        exit={{ opacity: 0, rotateY: 90 }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                        className="absolute inset-0"
                      >
                        <img 
                          src={imagePreview} 
                          alt="nutrition label" 
                          className="w-full h-full object-cover rounded-2xl shadow-2xl" 
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="product"
                        initial={{ opacity: 0, rotateY: 90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        exit={{ opacity: 0, rotateY: -90 }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                        className="absolute inset-0"
                      >
                        {SAMPLE_IMAGES.find(s => s.name === selectedProductName) && (
                          <img 
                            src={SAMPLE_IMAGES.find(s => s.name === selectedProductName).productUrl} 
                            alt={selectedProductName} 
                            className="w-full h-full object-cover rounded-2xl shadow-2xl" 
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                ) : (
                  // Uploaded image: show label directly (no product image pair)
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full"
                  >
                    <img 
                      src={imagePreview} 
                      alt="nutrition label" 
                      className="w-full h-full object-cover rounded-2xl shadow-2xl" 
                    />
                  </motion.div>
                )}
                
                {/* Scanning overlay with spinner */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: selectedProductName ? (showingLabel ? 1 : 0) : 1 }}
                  className="absolute inset-0 bg-black bg-opacity-40 rounded-2xl flex items-center justify-center"
                >
                  <Loader className="w-16 h-16 text-white animate-spin" />
                </motion.div>
              </div>
            </div>
            
            <div className="space-y-2">
              <motion.h3 
                key={selectedProductName ? (showingLabel ? 'scanning' : 'analyzing') : 'uploaded'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-gray-800 dark:text-gray-100"
              >
                {selectedProductName 
                  ? (showingLabel ? 'Reading Nutrition Facts…' : `Analyzing ${selectedProductName}`)
                  : 'Reading Nutrition Facts…'
                }
              </motion.h3>
              <motion.p 
                key={selectedProductName ? (showingLabel ? 'ocr' : 'loading') : 'uploaded-ocr'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {selectedProductName
                  ? (showingLabel ? 'OCR is scanning the nutrition label' : 'Preparing product image for analysis')
                  : 'OCR is scanning your uploaded nutrition label'
                }
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review Form */}
        {(step === 'form' || step === 'analyzing') && (
          <motion.div key="form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Image preview column */}
                <div className="space-y-3">
                  {imagePreview && (
                    <div className="space-y-2">
                      {/* Product name badge */}
                      {selectedProductName && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white px-4 py-2.5 rounded-xl shadow-lg">
                          <Sparkles className="w-5 h-5 flex-shrink-0" />
                          <p className="font-bold text-sm line-clamp-1 flex-1">{selectedProductName}</p>
                        </div>
                      )}
                      <ImageMagnifier 
                        src={imagePreview} 
                        alt={selectedProductName || "Food label"} 
                        maxHeight={288}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Change photo
                  </button>
                </div>

                {/* Form fields with tabs */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Tab Navigation */}
                  <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setReviewTab('nutrition')}
                      className={`flex-1 px-4 py-2 rounded-md font-semibold text-sm transition-all ${
                        reviewTab === 'nutrition'
                          ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <FlaskConical className="w-4 h-4 inline-block mr-2" />
                      Nutrition Facts
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewTab('profile')}
                      className={`flex-1 px-4 py-2 rounded-md font-semibold text-sm transition-all ${
                        reviewTab === 'profile'
                          ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <User className="w-4 h-4 inline-block mr-2" />
                      Your Profile
                    </button>
                  </div>

                  {/* Nutrition Facts Tab */}
                  {reviewTab === 'nutrition' && (
                    <motion.div
                      key="nutrition-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                  {/* OCR summary banner */}
                  {ocrFieldCount > 0 ? (
                    <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm">
                      <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>OCR extracted {ocrFieldCount} field{ocrFieldCount !== 1 ? 's' : ''}</strong> automatically.
                        Fields marked <span className="inline-flex items-center gap-0.5 px-1 rounded bg-emerald-200 dark:bg-emerald-800 text-xs font-semibold"><Sparkles className="w-2.5 h-2.5" /> OCR</span> were read from the label.
                        Review and correct any errors before running the analysis.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl text-sm">
                      <PencilLine className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>OCR could not read values automatically.</strong>{' '}
                        Please enter the nutrition facts from the label manually.
                      </span>
                    </div>
                  )}

                  {/* OCR calculation explanation */}
                  <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 px-4 py-3 rounded-xl text-xs">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">How OCR calculates values:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-300/90">
                        <li>Extracts nutrition values and serving size from the label image</li>
                        <li>Detects serving size automatically (e.g., "28g per serving")</li>
                        <li>Converts per-serving values to <strong>per 100g</strong> using: <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-xs">value × (100 ÷ serving_size)</code></li>
                        <li>Example: 8g fat per 28g serving → 8 × (100 ÷ 28) = <strong>28.6g per 100g</strong></li>
                        <li className="text-blue-600 dark:text-blue-400"><strong>Note:</strong> For US labels, manually convert Calories → kJ and Sodium → Salt first (see guide below)</li>
                      </ul>
                      <p className="text-blue-600 dark:text-blue-400 italic mt-1">💡 All values need to be per 100g for accurate NOVA classification</p>
                    </div>
                  </div>

                  {/* US Label Conversion Guide */}
                  <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 px-4 py-3 rounded-xl text-xs">
                    <Calculator className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">📋 Converting US Nutrition Labels:</p>
                      <p className="text-purple-700 dark:text-purple-300/90">US labels show Calories and Sodium - use these conversions:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <div className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1.5 rounded">
                          <strong>Energy:</strong> Calories × 4.184 = kJ<br/>
                          <span className="text-[10px] opacity-80">Example: 150 cal × 4.184 = 628 kJ</span>
                        </div>
                        <div className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1.5 rounded">
                          <strong>Salt:</strong> Sodium (mg) × 2.5 ÷ 1000 = Salt (g)<br/>
                          <span className="text-[10px] opacity-80">Example: 210mg × 2.5 ÷ 1000 = 0.53g</span>
                        </div>
                      </div>
                      <p className="text-purple-600 dark:text-purple-400 italic mt-1">💡 Then use the per-100g conversion formula above</p>
                    </div>
                  </div>

                  <div className="card p-5">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
                      Core Nutrition Facts <span className="text-red-500 text-sm font-normal">(required)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CORE_FIELDS.map(field => (
                        <NutritionField
                          key={field.key}
                          field={field}
                          value={nutrition[field.key]}
                          onChange={handleFieldChange}
                          autoDetected={!!autoFields[field.key]}
                          originalValue={ocrOriginalValues[field.key] || null}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Advanced fields (collapsible) */}
                  <div className="card p-5">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(v => !v)}
                      className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors"
                    >
                      <span>Advanced Fields <span className="font-normal text-gray-400">(optional — improves accuracy)</span></span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {ADVANCED_FIELDS.map(field => (
                              <NutritionField
                                key={field.key}
                                field={field}
                                value={nutrition[field.key]}
                                onChange={handleFieldChange}
                                autoDetected={!!autoFields[field.key]}
                                originalValue={ocrOriginalValues[field.key] || null}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                    </motion.div>
                  )}

                  {/* Profile Tab */}
                  {reviewTab === 'profile' && (
                    <motion.div
                      key="profile-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {userProfile ? (
                        <>
                          <div className="card p-5">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                              <User className="w-5 h-5 text-primary-600" />
                              Personal Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Name</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{userProfile.name || 'Not set'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Age</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{userProfile.age || 'Not set'} years</p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Gender</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{userProfile.gender || 'Not set'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Activity Level</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{userProfile.activityLevel || 'Not set'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Height</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{userProfile.height ? `${userProfile.height} in (${(userProfile.height * 2.54).toFixed(1)} cm)` : 'Not set'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Weight</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{userProfile.weight ? `${userProfile.weight} lbs (${(userProfile.weight * 0.453592).toFixed(1)} kg)` : 'Not set'}</p>
                              </div>
                            </div>
                          </div>

                          {userProfile.medicalConditions?.length > 0 && (
                            <div className="card p-5">
                              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-red-600" />
                                Medical Conditions
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {userProfile.medicalConditions.map((condition, idx) => (
                                  <span key={idx} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800">
                                    {condition}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {userProfile.allergies?.length > 0 && (
                            <div className="card p-5">
                              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                Allergies
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {userProfile.allergies.map((allergy, idx) => (
                                  <span key={idx} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium border border-amber-200 dark:border-amber-800">
                                    {allergy}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {userProfile.dietaryPreferences?.length > 0 && (
                            <div className="card p-5">
                              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-green-600" />
                                Dietary Preferences
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {userProfile.dietaryPreferences.map((pref, idx) => (
                                  <span key={idx} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800">
                                    {pref}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {userProfile.healthGoals && (
                            <div className="card p-5">
                              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary-600" />
                                Health Goals
                              </h3>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {userProfile.healthGoals}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="card p-8 text-center">
                          <User className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">No Profile Found</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Create your health profile to get personalized nutrition insights.
                          </p>
                          <a
                            href="#/profile"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Create Profile
                          </a>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Health Insights Toggle */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-4 bg-gradient-to-br from-primary-50/50 to-blue-50/50 dark:from-primary-900/10 dark:to-blue-900/10 border-2 border-primary-200 dark:border-primary-800"
                  >
                    <label className="flex items-center gap-4 cursor-pointer group">
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={showHealthInsights}
                          onChange={(e) => setShowHealthInsights(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-blue-500 transition-all duration-300 shadow-inner"></div>
                        <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 peer-checked:translate-x-7 peer-checked:shadow-lg flex items-center justify-center">
                          {showHealthInsights ? (
                            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                          ) : (
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            AI Health Insights
                          </span>
                          {showHealthInsights && (
                            <span className="px-2 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full animate-pulse">
                              ON
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {showHealthInsights ? (
                            <>
                              <span className="inline-flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Generate personalized health analysis (adds ~30-40s)
                              </span>
                            </>
                          ) : (
                            'Quick analysis only (NOVA classification + anomaly detection)'
                          )}
                        </p>
                      </div>
                    </label>
                  </motion.div>

                  {/* Submit */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={step === 'analyzing'}
                    className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {step === 'analyzing' ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Running NOVA Classification…
                      </>
                    ) : (
                      <>
                        <FlaskConical className="w-5 h-5" />
                        Run Analysis
                      </>
                    )}
                  </motion.button>
                  
                  {step === 'analyzing' && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {showHealthInsights ? (
                        'Analyzing nutrition data. Results will show immediately, followed by AI health insights (30-40s).'
                      ) : (
                        'Running quick analysis (NOVA classification + anomaly detection)...'
                      )}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultsPanel result={result} imagePreview={imagePreview} productName={selectedProductName} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Dashboard