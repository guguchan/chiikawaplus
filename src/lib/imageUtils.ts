// HEIC/HEIF excluded: browser Canvas API cannot decode them, img.onload silently hangs
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function compressImage(file: File, maxDim = 800, quality = 0.75): Promise<string> {
  if (!ALLOWED_MIME.includes(file.type) && !file.type.startsWith('image/')) {
    return Promise.reject(new Error(`不支援的檔案格式：${file.type || '未知'}`))
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round(height * maxDim / width); width = maxDim }
        else { width = Math.round(width * maxDim / height); height = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}
