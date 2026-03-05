import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Image as ImageIcon,
  X,
  Check,
  Loader,
  Camera,
  Scan,
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react'

const Dashboard = () => {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )
    
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files)
    processFiles(files)
  }

  const processFiles = (files) => {
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    
    // Simulate analysis
    newFiles.forEach((fileObj, index) => {
      setTimeout(() => {
        analyzeImage(fileObj.id)
      }, (index + 1) * 1500)
    })
  }

  const analyzeImage = (fileId) => {
    setUploadedFiles(prev =>
      prev.map(f =>
        f.id === fileId ? { ...f, status: 'analyzing' } : f
      )
    )

    setTimeout(() => {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, status: 'complete' } : f
        )
      )
    }, 2000)
  }

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const stats = [
    { label: 'Products Scanned', value: uploadedFiles.length, icon: Scan, color: 'primary' },
    { label: 'Nutritional Score', value: 'B+', icon: TrendingUp, color: 'health-success' },
    { label: 'Warnings', value: '2', icon: AlertTriangle, color: 'health-warning' },
    { label: 'Info Available', value: '95%', icon: Info, color: 'secondary' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          Scan Your <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Food Labels</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Upload product label photos for instant AI-powered nutritional analysis
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card p-6 text-center"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-${stat.color} bg-opacity-10 rounded-xl mb-3`}>
                <Icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{stat.value}</p>
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
            card p-12 text-center cursor-pointer transition-all duration-300
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
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full mb-6 shadow-lg">
              {isDragging ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Upload className="w-12 h-12 text-white" />
                </motion.div>
              ) : (
                <Camera className="w-12 h-12 text-white" />
              )}
            </div>

            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {isDragging ? 'Drop your images here!' : 'Upload Product Labels'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Drag & drop images or click to browse
            </p>

            <div className="flex items-center justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary"
                type="button"
              >
                <Upload className="w-5 h-5 mr-2 inline" />
                Choose Files
              </motion.button>
              <span className="text-sm text-gray-500">or</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-secondary"
                type="button"
              >
                <Camera className="w-5 h-5 mr-2 inline" />
                Take Photo
              </motion.button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Supports: JPG, PNG, WEBP (Max 10MB per file)
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Uploaded Files Grid */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Uploaded Labels ({uploadedFiles.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uploadedFiles.map((fileObj, index) => (
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
                      {fileObj.status === 'pending' && (
                        <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          <span>Pending</span>
                        </div>
                      )}
                      {fileObj.status === 'analyzing' && (
                        <div className="bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <Loader className="w-3 h-3 animate-spin" />
                          <span>Analyzing</span>
                        </div>
                      )}
                      {fileObj.status === 'complete' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-health-success text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Complete</span>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate mb-1">
                      {fileObj.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(fileObj.file.size / 1024).toFixed(2)} KB
                    </p>

                    {fileObj.status === 'complete' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Nutri-Score:</span>
                          <span className="font-bold text-health-success">B+</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                          <span className="font-bold text-primary-600 dark:text-primary-400">94%</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="card p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-700"
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
          <Info className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
          Tips for Best Results
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>Ensure the nutrition facts panel is clearly visible and well-lit</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>Capture the entire label without cropping important information</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>Avoid blurry images - hold your camera steady or use a flat surface</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>Upload multiple angles if the label has information on different sides</span>
          </li>
        </ul>
      </motion.div>
    </div>
  )
}

export default Dashboard
