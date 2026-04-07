const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Check if the API backend is online
 * @returns {Promise<boolean>}
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
/**
 * Check AI model health
 * @returns {Promise<Object>} { status: 'ok'|'error', model?: string, error?: string }
 */
export async function checkAIHealth() {
  try {
    const response = await fetch(`${API_BASE}/health/ai`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      return await response.json();
    }
    return { status: 'error', error: 'Request failed' };
  } catch (error) {
    return { status: 'error', error: error.message || 'Connection failed' };
  }
}
/**
 * OCR a food label image and return auto-detected nutrition values.
 * @param {File} imageFile
 * @returns {Promise<{extracted: Object, auto_fields: Object, fields_found: number}>}
 */
export async function extractNutrition(imageFile) {
  const form = new FormData();
  form.append("file", imageFile);

  const response = await fetch(`${API_BASE}/extract`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Submit a food label image + nutrition fields to the backend /analyze endpoint.
 * @param {File} imageFile
 * @param {Object} nutrition - Nutrition fields keyed by field name
 * @returns {Promise<Object>}
 */
export async function analyzeLabel(imageFile, nutrition) {
  const form = new FormData();
  form.append("file", imageFile);

  Object.entries(nutrition).forEach(([key, value]) => {
    form.append(key, String(value));
  });

  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Generate health insights from analysis results
 * @param {Object} analysisResult - NOVA classification and anomaly detection results
 * @param {Object} userProfile - User's health profile
 * @param {string} productName - Name of the product
 * @returns {Promise<Object>}
 */
export async function generateHealthInsights(analysisResult, userProfile, productName = "Food Product") {
  // Build product data from analysis results
  const productData = {
    product_name: productName,
    nova_class: analysisResult.nova_group,
    nutrition: analysisResult.nutrition_per_100g,
    anomalies: analysisResult.anomaly
  };

  // Build user profile in snake_case format expected by backend
  const userProfileData = {
    age: parseInt(userProfile.age) || 30,
    weight: parseFloat(userProfile.weight) || 70,
    height: parseFloat(userProfile.height) || 170,
    activity_level: userProfile.activityLevel || "moderate",
    health_conditions: userProfile.medicalConditions || [],
    dietary_restrictions: userProfile.dietaryPreferences || [],
    allergies: userProfile.allergies || [],
    goals: userProfile.healthGoals ? [userProfile.healthGoals] : [],
    family_history: []
  };

  // Increased timeout to 60 seconds for AI health insights generation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_BASE}/health-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_data: productData,
        user_profile: userProfileData
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - health insights generation took too long');
    }
    throw error;
  }
}

/**
 * Complete pipeline: Analyze + Generate health insights
 * @param {File} imageFile
 * @param {Object} nutrition
 * @param {Object} userProfile
 * @returns {Promise<Object>}
 */
export async function analyzeWithInsights(imageFile, nutrition, userProfile) {
  const form = new FormData();
  form.append("file", imageFile);
  form.append("user_profile", JSON.stringify(userProfile));

  Object.entries(nutrition).forEach(([key, value]) => {
    form.append(key, String(value));
  });

  // Increased timeout to 60 seconds for AI health insights generation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_BASE}/analyze-with-insights`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - health insights generation took too long');
    }
    throw error;
  }
}

/**
 * Test endpoint with mocked product data
 * @param {Object} userProfile - Optional user profile
 * @returns {Promise<Object>}
 */
export async function testMockInsights(userProfile = null) {
  const body = userProfile ? { user_profile: userProfile } : {};
  
  const response = await fetch(`${API_BASE}/test/mock-insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.ok;
}
