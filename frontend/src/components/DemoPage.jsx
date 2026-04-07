import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  User,
  Package,
  Brain,
  Loader,
  ChevronRight,
  AlertTriangle,
  Check,
  RefreshCw,
} from 'lucide-react'
import SampleProductGallery from './SampleProductGallery'
import HealthInsightsPanel from './HealthInsightsPanel'
import { testMockInsights } from '../api'

// Default user profile with realistic values
const DEFAULT_USER_PROFILE = {
  age: 35,
  weight: 75, // kg
  height: 175, // cm
  activity_level: 'moderate',
  health_conditions: ['high blood pressure', 'pre-diabetes'],
  dietary_restrictions: ['trying to reduce sodium', 'low sugar diet'],
  allergies: ['peanuts'],
  goals: ['weight loss', 'heart health', 'better energy'],
  family_history: ['type 2 diabetes', 'heart disease'],
}

function DemoPage() {
  const [step, setStep] = useState(1) // 1: Profile, 2: Product Selection, 3: Insights
  const [userProfile, setUserProfile] = useState(DEFAULT_USER_PROFILE)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [editingProfile, setEditingProfile] = useState(false)

  // Auto-load profile from localStorage if available
  useEffect(() => {
    const savedProfile = localStorage.getItem('demoUserProfile')
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile)
        setUserProfile({ ...DEFAULT_USER_PROFILE, ...parsed })
      } catch (e) {
        console.error('Failed to parse saved profile:', e)
      }
    }
  }, [])

  const handleProfileSave = () => {
    localStorage.setItem('demoUserProfile', JSON.stringify(userProfile))
    setEditingProfile(false)
    setStep(2)
  }

  const handleProductSelect = async (product) => {
    setSelectedProduct(product)
    setStep(3)
    setLoading(true)
    setError(null)
    
    try {
      // Call the mock insights endpoint
      const response = await testMockInsights(userProfile)
      setInsights(response.health_insights)
    } catch (err) {
      console.error('Error generating insights:', err)
      setError(err.message || 'Failed to generate health insights')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setSelectedProduct(null)
    setInsights(null)
    setError(null)
  }

  const handleTestWithMockData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await testMockInsights(userProfile)
      setInsights(response.health_insights)
      setSelectedProduct({
        name: 'Sample Cheese Flavored Snack (Test Data)',
        estimatedNova: 4,
      })
      setStep(3)
    } catch (err) {
      console.error('Error generating insights:', err)
      setError(err.message || 'Failed to generate health insights')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-lg"
        >
          <Brain className="w-8 h-8" />
        </motion.div>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
          Agentic AI Health Insights Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Experience personalized health insights powered by multi-agent RAG framework with Azure OpenAI
        </p>
      </div>

      {/* Progress Steps */}
      <div className="card p-6">
        <div className="flex items-center justify-center gap-4">
          {[
            { num: 1, label: 'Profile', icon: User },
            { num: 2, label: 'Product', icon: Package },
            { num: 3, label: 'Insights', icon: Sparkles },
          ].map((s, idx) => {
            const Icon = s.icon
            const isActive = step === s.num
            const isCompleted = step > s.num

            return (
              <div key={s.num} className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                      ${isActive ? 'bg-primary-500 text-white shadow-lg scale-110' : ''}
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${!isActive && !isCompleted ? 'bg-gray-200 dark:bg-gray-700 text-gray-500' : ''}
                    `}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={`
                      text-sm font-medium hidden sm:inline
                      ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}
                      ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}
                      ${!isActive && !isCompleted ? 'text-gray-500' : ''}
                    `}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < 2 && (
                  <ChevronRight
                    className={`w-5 h-5 ${isCompleted ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Profile */}
        {step === 1 && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Your Health Profile
              </h2>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="btn-secondary text-sm"
              >
                {editingProfile ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>

            {editingProfile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={userProfile.age}
                      onChange={(e) => setUserProfile({ ...userProfile, age: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={userProfile.weight}
                      onChange={(e) => setUserProfile({ ...userProfile, weight: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={userProfile.height}
                      onChange={(e) => setUserProfile({ ...userProfile, height: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Activity Level
                    </label>
                    <select
                      value={userProfile.activity_level}
                      onChange={(e) => setUserProfile({ ...userProfile, activity_level: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="sedentary">Sedentary</option>
                      <option value="light">Light</option>
                      <option value="moderate">Moderate</option>
                      <option value="active">Active</option>
                      <option value="very_active">Very Active</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleProfileSave} className="btn-primary w-full">
                  Save Profile & Continue
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Age</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{userProfile.age}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Weight</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{userProfile.weight} kg</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Height</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{userProfile.height} cm</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Activity</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100 capitalize">
                      {userProfile.activity_level.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Health Conditions</p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      {userProfile.health_conditions.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Health Goals</p>
                    <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                      {userProfile.goals.map((g, i) => (
                        <li key={i}>• {g}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="btn-primary flex-1">
                    Continue to Product Selection
                  </button>
                  <button onClick={handleTestWithMockData} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Test with Mock Data
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Product Selection */}
        {step === 2 && (
          <motion.div
            key="products"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <SampleProductGallery onSelectProduct={handleProductSelect} />
            
            <div className="text-center">
              <button onClick={() => setStep(1)} className="btn-secondary">
                ← Back to Profile
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Insights */}
        {step === 3 && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {selectedProduct && (
              <div className="card p-6 bg-gradient-to-br from-primary-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-2 border-primary-300 dark:border-primary-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      Analyzing: {selectedProduct.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      NOVA Classification: Group {selectedProduct.estimatedNova}
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Start Over
                  </button>
                </div>
              </div>
            )}

            <HealthInsightsPanel
              insights={insights}
              loading={loading}
              error={error}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DemoPage
