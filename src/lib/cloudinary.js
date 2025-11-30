//===============================================================
//Script Name: cloudinary.js
//Script Location: src/lib/cloudinary.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.1.0
//About: Helper to upload images to Cloudinary via Unsigned Preset.
//       FIXED: Now properly loads Environment Variables.
//===============================================================

// LOAD CONFIG FROM ENV
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Uploads a file to Cloudinary and returns the secure URL.
 * @param {File} file - The file object from the input tag
 * @param {Function} onProgress - Optional callback for upload progress (0-100)
 * @returns {Promise<string>} - The Secure URL of the uploaded image
 */
export async function uploadImage(file, onProgress) {
  if (!file) throw new Error('No file provided')
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary config missing. Check .env file.')
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
  const formData = new FormData()

  // Standard Cloudinary Unsigned Upload Parameters
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  
  // Optional: Add tags to organize by environment
  formData.append('tags', 'browser_upload,reload_tracker')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.open('POST', url, true)

    // Listen for progress
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress(percent)
        }
      }
    }

    // Handle response
    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve(response.secure_url)
      } else {
        console.error('Cloudinary Upload Error:', xhr.responseText)
        reject(new Error('Image upload failed. Check Cloud Name & Preset.'))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error during upload.'))
    }

    xhr.send(formData)
  })
}