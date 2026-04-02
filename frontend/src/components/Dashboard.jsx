import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios' // Added Axios for the real connection
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
} from 'lucide-react'
import { analyzeLabel, extractNutrition } from '../api'

// ── Nutrition field definitions ───────────────────────────────────────────────
const CORE_FIELDS = [
  { key: 'energy_100g',        label: 'Energy (kJ)',          unit: 'kJ',   required: true,  placeholder: '1500', hint: 'Total energy per 100g/100ml in kilojoules' },
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

const DEFAULT_VALUES = Object.fromEntries(
  [...CORE_FIELDS, ...ADVANCED_FIELDS].map(f => [f.key, ''])
)

// ── NOVA colour helpers ───────────────────────────────────────────────────────
const NOVA_BG   = { 1: 'bg-emerald-500', 2: 'bg-blue-500',   3: 'bg-amber-500',  4: 'bg-red-500'   }
const NOVA_TEXT = { 1: 'text-emerald-600', 2: 'text-blue-600', 3: 'text-amber-600', 4: 'text-red-600' }
const NOVA_BORDER = { 1: 'border-emerald-400', 2: 'border-blue-400', 3: 'border-amber-400', 4: 'border-red-400' }

const NUTRISCORE_BG = { A:'bg-emerald-500', B:'bg-lime-500', C:'bg-yellow-400', D:'bg-orange-500', E:'bg-red-600' }

// ── Sub-components ────────────────────────────────────────────────────────────

function NutritionField({ field, value, onChange, autoDetected = false }) {
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

function ResultsPanel({ result, imagePreview, onReset }) {
  const { nova_group, nova_description, nova_confidence, nutriscore_grade, anomaly, nutrition_per_100g } = result

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
            <div className="card overflow-hidden">
              <img src={imagePreview} alt="Food label" className="w-full object-contain max-h-64 bg-gray-50 dark:bg-gray-800" />
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
    </motion.div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const Dashboard = () => {
  // steps: 'upload' | 'extracting' | 'form' | 'analyzing' | 'results'
  const [step, setStep] = useState('upload')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
<<<<<<< Updated upstream
=======
  const [nutrition, setNutrition] = useState(DEFAULT_VALUES)
  const [autoFields, setAutoFields] = useState({})    // fields detected by OCR
  const [ocrFieldCount, setOcrFieldCount] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
>>>>>>> Stashed changes
  const fileInputRef = useRef(null)

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

<<<<<<< Updated upstream
  const processFiles = (files) => {
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      nova_group: null, // Placeholder for model result
      confidence: null
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    
    // Trigger real analysis for each file
    newFiles.forEach((fileObj) => {
      analyzeImage(fileObj.id, fileObj.file)
    })
  }

  // UPDATED: Real API call to your FastAPI backend
  const analyzeImage = async (fileId, file) => {
    setUploadedFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, status: 'analyzing' } : f)
    )

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('http://localhost:8000/predict', formData)
      
      // DEBUG: See exactly what the i9 is sending
      console.log("Prediction Success:", response.data)

      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { 
            ...f, 
            status: 'complete', 
            // FIX: Ensure these match the Python dictionary keys exactly
            nova_group: response.data.nova_group || 4, 
            confidence: response.data.confidence || 0.94 
          } : f
        )
      )
    } catch (error) {
      console.error("Prediction failed:", error)
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f)
      )
=======
  const acceptImage = async (file) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError(null)
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
      // Expand advanced section if OCR found any advanced fields
      const advancedKeys = ADVANCED_FIELDS.map(f => f.key)
      if (advancedKeys.some(k => ocr.auto_fields?.[k])) setShowAdvanced(true)
    } catch (_err) {
      // OCR failed — still open form, user enters manually
      setAutoFields({})
      setOcrFieldCount(0)
    }

    setStep('form')
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

    // Convert all nutrition values to numbers, defaulting blanks to 0
    const numericNutrition = Object.fromEntries(
      [...CORE_FIELDS, ...ADVANCED_FIELDS].map(f => [f.key, parseFloat(nutrition[f.key]) || 0])
    )

    try {
      const data = await analyzeLabel(imageFile, numericNutrition)
      setResult(data)
      setStep('results')
    } catch (err) {
      setError(`Analysis failed: ${err.message}`)
      setStep('form')
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  // Helper to color-code based on NOVA Group
  const getNovaStyles = (group) => {
    const styles = {
      1: { color: 'bg-green-500', label: 'Unprocessed' },
      2: { color: 'bg-yellow-500', label: 'Processed Culinary' },
      3: { color: 'bg-orange-500', label: 'Processed' },
      4: { color: 'bg-red-500', label: 'Ultra-Processed' }
    }
    return styles[group] || { color: 'bg-primary-500', label: 'Analyzing' }
  }

  const stats = [
    { label: 'Products Scanned', value: uploadedFiles.length, icon: Scan, color: 'primary' },
    { label: 'Current Session', value: 'Active', icon: TrendingUp, color: 'health-success' },
    { label: 'ML Model', value: 'XGBoost', icon: AlertTriangle, color: 'health-warning' },
    { label: 'Accuracy', value: '94%', icon: Info, color: 'secondary' },
=======
  // ── Render helpers ──────────────────────────────────────────────────────────

  const STEPS = [
    { id: 'upload',     label: '1. Upload' },
    { id: 'extracting', label: '2. OCR Scan' },
    { id: 'form',       label: '3. Review' },
    { id: 'results',    label: '4. Results' },
>>>>>>> Stashed changes
  ]

  const stepIndex = (id) => STEPS.findIndex(s => s.id === id)
  const activeIdx = stepIndex(step === 'analyzing' ? 'form' : step)

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            i === activeIdx
              ? 'bg-primary-600 text-white'
              : i < activeIdx
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
          }`}>
            {s.label}
          </div>
          {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      ))}
    </div>
  )

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
<<<<<<< Updated upstream
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-2 sm:px-0">
          Upload product label photos for instant AI-powered NOVA classification
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card p-4 sm:p-6 text-center"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-opacity-10 rounded-xl mb-3`}>
                <Icon className={`w-6 h-6`} />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            card p-6 sm:p-8 md:p-12 text-center cursor-pointer transition-all duration-300
            ${isDragging ? 'border-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-105' : 'border-2 border-dashed border-gray-300 dark:border-gray-600'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          <motion.div
            animate={{
              y: isDragging ? -10 : 0,
              scale: isDragging ? 1.1 : 1
            }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full mb-4 sm:mb-6 shadow-lg">
              {isDragging ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                </motion.div>
              ) : (
                <Camera className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {isDragging ? 'Drop your images here!' : 'Upload Product Labels'}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
              Drag & drop images or click to browse
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary w-full sm:w-auto"
                type="button"
              >
                <Upload className="w-5 h-5 mr-2 inline" />
                Choose Files
              </motion.button>
              <span className="text-sm text-gray-500 hidden sm:inline">or</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-secondary w-full sm:w-auto"
                type="button"
              >
                <Camera className="w-5 h-5 mr-2 inline" />
                Take Photo
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Uploaded Files Grid */}
=======
        <p className="text-base text-gray-600 dark:text-gray-300">
          Upload a food label photo — the AI reads the nutrition facts automatically and classifies the product.
        </p>
      </motion.div>

      <StepIndicator />

      {/* Error banner */}
>>>>>>> Stashed changes
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm"
          >
<<<<<<< Updated upstream
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Analysis Results ({uploadedFiles.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uploadedFiles.map((fileObj, index) => {
                const novaStyle = getNovaStyles(fileObj.nova_group);
                return (
                  <motion.div
                    key={fileObj.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.1 }}
                    className="card overflow-hidden group"
                  >
                    {/* Image Preview */}
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <img
                        src={fileObj.preview}
                        alt="Product label"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeFile(fileObj.id)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      {/* Status Badge */}
                      <div className="absolute bottom-2 right-2">
                        {fileObj.status === 'analyzing' && (
                          <div className="bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <Loader className="w-3 h-3 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        )}
                        {fileObj.status === 'error' && (
                          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Error</span>
                          </div>
                        )}
                        {fileObj.status === 'complete' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`${novaStyle.color} text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1`}
                          >
                            <Check className="w-3 h-3" />
                            <span>NOVA {fileObj.nova_group}</span>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate mb-1">
                        {fileObj.file.name}
                      </p>

                      {fileObj.status === 'complete' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Classification:</span>
                            <span className="font-bold text-gray-800 dark:text-gray-100">{novaStyle.label}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-gray-600 dark:text-gray-400">Confidence Score:</span>
                            <span className="font-bold text-primary-600">{(fileObj.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
=======
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {error}
>>>>>>> Stashed changes
          </motion.div>
        )}
      </AnimatePresence>

<<<<<<< Updated upstream
      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="card p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-700"
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
          <Info className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
          Capstone Demo Instructions
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>Ensure the FastAPI server is running on <strong>port 8000</strong></span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>Uploaded images are processed by the <strong>xgb_tuned.json</strong> model</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>NOVA classification is derived from nutritional profiles mapped in Notebook 04</span>
          </li>
        </ul>
      </motion.div>
=======
      {/* ── Step 1: Upload ── */}
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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

            {/* Tips */}
            <div className="card p-5 mt-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-500" /> Tips for Best Results
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-600 dark:text-gray-300">
                <li>• Photograph the <strong>Nutrition Facts</strong> panel clearly</li>
                <li>• Ensure all text is readable and well-lit</li>
                <li>• Include the <strong>ingredients list</strong> for the additive count</li>
                <li>• Values are <strong>auto-extracted</strong> — review before submitting</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: OCR extracting spinner ── */}
        {step === 'extracting' && (
          <motion.div
            key="extracting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card p-16 flex flex-col items-center gap-6 text-center"
          >
            <div className="relative">
              <img src={imagePreview} alt="label" className="w-32 h-32 object-cover rounded-2xl opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader className="w-12 h-12 text-primary-500 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Reading Nutrition Facts…</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">OCR is scanning your food label image</p>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Review Form ── */}
        {(step === 'form' || step === 'analyzing') && (
          <motion.div key="form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Image preview column */}
                <div className="space-y-3">
                  <div className="card overflow-hidden">
                    <img src={imagePreview} alt="Food label" className="w-full object-contain max-h-72 bg-gray-50 dark:bg-gray-800" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Change photo
                  </button>
                </div>

                {/* Form fields */}
                <div className="lg:col-span-2 space-y-4">
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
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

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
                        Analysing with AI models…
                      </>
                    ) : (
                      <>
                        <FlaskConical className="w-5 h-5" />
                        Run Analysis
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── Step 3: Results ── */}
        {step === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultsPanel result={result} imagePreview={imagePreview} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>
>>>>>>> Stashed changes
    </div>
  )
}

export default Dashboard