import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Heart, Activity, Ruler, Weight, Calendar, AlertCircle, Save, Check, Plus, X } from 'lucide-react'

const Profile = () => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: '',
    activityLevel: 'moderate',
    medicalConditions: [],
    allergies: [],
    dietaryPreferences: [],
    healthGoals: '',
  })

  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})
  const [newCondition, setNewCondition] = useState('')
  const [newAllergy, setNewAllergy] = useState('')
  const [newDietPref, setNewDietPref] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    // Age validation
    if (!formData.age) {
      newErrors.age = 'Age is required'
    } else if (formData.age < 1 || formData.age > 120) {
      newErrors.age = 'Age must be between 1 and 120'
    }

    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender'
    }

    // Height validation
    if (!formData.height) {
      newErrors.height = 'Height is required'
    } else if (formData.height < 12 || formData.height > 96) {
      newErrors.height = 'Height must be between 12 and 96 inches'
    }

    // Weight validation
    if (!formData.weight) {
      newErrors.weight = 'Weight is required'
    } else if (formData.weight < 20 || formData.weight > 1000) {
      newErrors.weight = 'Weight must be between 20 and 1000 lbs'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate form before saving
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('.border-red-500')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    // Save to localStorage or send to backend
    localStorage.setItem('userProfile', JSON.stringify(formData))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const addMedicalCondition = () => {
    if (newCondition.trim()) {
      setFormData({ ...formData, medicalConditions: [...formData.medicalConditions, newCondition.trim()] })
      setNewCondition('')
    }
  }

  const removeMedicalCondition = (index) => {
    setFormData({ ...formData, medicalConditions: formData.medicalConditions.filter((_, i) => i !== index) })
  }

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData({ ...formData, allergies: [...formData.allergies, newAllergy.trim()] })
      setNewAllergy('')
    }
  }

  const removeAllergy = (index) => {
    setFormData({ ...formData, allergies: formData.allergies.filter((_, i) => i !== index) })
  }

  const addDietPref = () => {
    if (newDietPref.trim()) {
      setFormData({ ...formData, dietaryPreferences: [...formData.dietaryPreferences, newDietPref.trim()] })
      setNewDietPref('')
    }
  }

  const removeDietPref = (index) => {
    setFormData({ ...formData, dietaryPreferences: formData.dietaryPreferences.filter((_, i) => i !== index) })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-6 sm:mb-8 px-1">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full mb-4 shadow-lg">
          <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">Health Profile</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Help us personalize your nutritional recommendations</p>
      </motion.div>

      {/* Success Message */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-6 bg-health-success text-white p-4 rounded-xl flex items-center space-x-3 shadow-lg"
        >
          <Check className="w-6 h-6" />
          <span className="font-medium">Profile saved successfully!</span>
        </motion.div>
      )}

      {/* Error Message */}
      {Object.keys(errors).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-red-500 text-white p-4 rounded-xl shadow-lg"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Please fix the following errors:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Personal Information Card */}
          <motion.div variants={itemVariants} className="card p-4 sm:p-6 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Personal Information</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input-field ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter your name"
                />
                {errors.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs mt-1 flex items-center"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.name}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="label">Age *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className={`input-field pl-11 ${errors.age ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="25"
                  />
                </div>
                {errors.age && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs mt-1 flex items-center"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.age}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="label">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`input-field ${errors.gender ? 'border-red-500 focus:border-red-500' : ''}`}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="preferNotToSay">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs mt-1 flex items-center"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.gender}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="label">Activity Level</label>
                <select
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="very">Very Active</option>
                  <option value="extra">Extra Active</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Body Metrics Card */}
          <motion.div variants={itemVariants} className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Body Metrics</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Height (inches) *</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    className={`input-field pl-11 ${errors.height ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="67"
                    step="0.1"
                  />
                </div>
                {errors.height && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs mt-1 flex items-center"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.height}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="label">Weight (lbs) *</label>
                <div className="relative">
                  <Weight className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className={`input-field pl-11 ${errors.weight ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="154"
                    step="0.1"
                  />
                </div>
                {errors.weight && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs mt-1 flex items-center"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.weight}
                  </motion.p>
                )}
              </div>

              {formData.height && formData.weight && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-xl border-2 border-primary-200 dark:border-primary-700"
                >
                  <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">BMI</p>
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {((formData.weight / (formData.height ** 2)) * 703).toFixed(1)}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Health Information Card */}
          <motion.div variants={itemVariants} className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-health-danger bg-opacity-10 dark:bg-health-danger dark:bg-opacity-20 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-health-danger" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Health Goals</h2>
            </div>

            <div>
              <label className="label">Primary Health Goals</label>
              <select
                name="healthGoals"
                value={formData.healthGoals}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select your goal</option>
                <option value="weightLoss">Weight Loss</option>
                <option value="weightGain">Muscle Gain</option>
                <option value="maintenance">Maintain Weight</option>
                <option value="healthyEating">Healthy Eating</option>
                <option value="diseaseManagement">Disease Management</option>
              </select>
            </div>
          </motion.div>

          {/* Medical Conditions Card */}
          <motion.div variants={itemVariants} className="card p-4 sm:p-6 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-health-warning bg-opacity-10 dark:bg-health-warning dark:bg-opacity-20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-health-warning" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Medical Information</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="label">Medical Conditions</label>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedicalCondition())}
                    className="input-field flex-1"
                    placeholder="e.g., Diabetes, Hypertension..."
                  />
                  <motion.button
                    type="button"
                    onClick={addMedicalCondition}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors w-full sm:w-auto"
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.medicalConditions.map((condition, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg group"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-200">{condition}</span>
                      <button
                        type="button"
                        onClick={() => removeMedicalCondition(index)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Allergies & Intolerances</label>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                    className="input-field flex-1"
                    placeholder="e.g., Nuts, Lactose, Gluten..."
                  />
                  <motion.button
                    type="button"
                    onClick={addAllergy}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors w-full sm:w-auto"
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.allergies.map((allergy, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg group"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-200">{allergy}</span>
                      <button
                        type="button"
                        onClick={() => removeAllergy(index)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label">Dietary Preferences</label>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="text"
                    value={newDietPref}
                    onChange={(e) => setNewDietPref(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDietPref())}
                    className="input-field flex-1"
                    placeholder="e.g., Vegetarian, Vegan, Keto..."
                  />
                  <motion.button
                    type="button"
                    onClick={addDietPref}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors w-full sm:w-auto"
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.dietaryPreferences.map((pref, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg group"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-200">{pref}</span>
                      <button
                        type="button"
                        onClick={() => removeDietPref(index)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Submit Button */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex justify-center"
        >
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full sm:w-auto px-6 sm:px-12 py-3 sm:py-4 text-base sm:text-lg flex items-center justify-center space-x-3"
          >
            <Save className="w-6 h-6" />
            <span>Save Profile</span>
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  )
}

export default Profile
