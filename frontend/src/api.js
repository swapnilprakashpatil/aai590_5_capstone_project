const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.ok;
}
