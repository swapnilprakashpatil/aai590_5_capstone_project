import { motion } from 'framer-motion'
import {
  Brain,
  ShoppingCart,
  Calendar,
  BarChart3,
  Bell,
  Users,
  Utensils,
  Heart,
  Sparkles,
  Crown,
  Clock,
  TrendingUp
} from 'lucide-react'

const ComingSoon = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI Nutritional Recommendations',
      description: 'Get personalized food suggestions based on your health profile, dietary restrictions, and nutritional goals using advanced machine learning.',
      status: 'In Development',
      color: 'primary',
      eta: 'Q2 2026'
    },
    {
      icon: ShoppingCart,
      title: 'Smart Shopping Assistant',
      description: 'Scan products while shopping and get instant health scores, alternatives, and better choices that match your dietary needs.',
      status: 'Coming Soon',
      color: 'secondary',
      eta: 'Q3 2026'
    },
    {
      icon: Calendar,
      title: 'Meal Planning & Tracking',
      description: 'Plan your weekly meals with AI-generated meal plans that balance nutrition, taste, and your health objectives.',
      status: 'Planned',
      color: 'health-success',
      eta: 'Q3 2026'
    },
    {
      icon: BarChart3,
      title: 'Nutrition Analytics Dashboard',
      description: 'Visual insights into your nutritional intake with detailed charts, trends, and personalized recommendations for improvement.',
      status: 'Planned',
      color: 'health-info',
      eta: 'Q4 2026'
    },
    {
      icon: Bell,
      title: 'Smart Alerts & Reminders',
      description: 'Get notified about product recalls, new healthier alternatives, and when you need to restock your favorite healthy items.',
      status: 'Researching',
      color: 'health-warning',
      eta: 'Q4 2026'
    },
    {
      icon: Users,
      title: 'Family Health Profiles',
      description: 'Manage nutrition for your entire family with individual profiles, shared meal planning, and family-wide health tracking.',
      status: 'Planned',
      color: 'primary',
      eta: '2027'
    },
    {
      icon: Utensils,
      title: 'Recipe Recommendations',
      description: 'Discover healthy recipes tailored to your dietary preferences, using ingredients that align with your nutritional goals.',
      status: 'Researching',
      color: 'secondary',
      eta: '2027'
    },
    {
      icon: Heart,
      title: 'Health Impact Predictor',
      description: 'See how your food choices might impact your specific health conditions over time with AI-powered predictive analytics.',
      status: 'Future',
      color: 'health-danger',
      eta: '2027'
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking & Goals',
      description: 'Set health and nutrition goals, track your progress, and celebrate milestones with gamification and achievement badges.',
      status: 'Planned',
      color: 'health-success',
      eta: 'Q4 2026'
    },
  ]

  const premiumFeatures = [
    { icon: Crown, text: 'Unlimited product scans' },
    { icon: Brain, text: 'Advanced AI analysis' },
    { icon: Users, text: 'Family plan support' },
    { icon: BarChart3, text: 'Detailed analytics' },
  ]

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
      className="max-w-6xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-12">
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full mb-6 shadow-2xl"
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>
        
        <h1 className="text-5xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Exciting Features <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Coming Soon</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          We're constantly innovating to bring you the most advanced nutritional analysis platform. Here's what's in the pipeline!
        </p>
      </motion.div>

      {/* Premium Teaser */}
      <motion.div
        variants={itemVariants}
        className="card p-8 bg-gradient-to-r from-primary-500 to-secondary-500 text-white mb-12 relative overflow-hidden"
      >
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Crown className="w-8 h-8" />
                <h2 className="text-3xl font-bold">NutriVision Premium</h2>
              </div>
              <p className="text-primary-100 text-lg">Unlock the full potential of AI-powered nutrition</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-primary-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              Join Waitlist
            </motion.button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {premiumFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center space-x-2"
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {features.map((feature, index) => {
          const Icon = feature.icon
          
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="card p-6 group relative overflow-hidden"
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-14 h-14 bg-${feature.color} bg-opacity-10 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 text-${feature.color}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={`
                    inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
                    ${feature.status === 'In Development' ? 'bg-health-success bg-opacity-10 text-health-success' : ''}
                    ${feature.status === 'Coming Soon' ? 'bg-primary-500 bg-opacity-10 text-primary-600' : ''}
                    ${feature.status === 'Planned' ? 'bg-secondary-500 bg-opacity-10 text-secondary-600' : ''}
                    ${feature.status === 'Researching' ? 'bg-health-warning bg-opacity-10 text-health-warning' : ''}
                    ${feature.status === 'Future' ? 'bg-gray-500 bg-opacity-10 text-gray-600' : ''}
                  `}>
                    {feature.status}
                  </span>
                  
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>{feature.eta}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Newsletter Signup */}
      <motion.div
        variants={itemVariants}
        className="card p-8 text-center bg-gradient-to-br from-gray-50 to-primary-50 dark:from-gray-800 dark:to-primary-900/20"
      >
        <Bell className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Stay Updated
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
          Be the first to know when new features launch. Join our newsletter for exclusive updates and early access.
        </p>
        
        <div className="flex max-w-md mx-auto gap-3">
          <input
            type="email"
            placeholder="Enter your email"
            className="input-field flex-1"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary"
          >
            Subscribe
          </motion.button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </motion.div>
    </motion.div>
  )
}

export default ComingSoon
