export const shareContent = async (
  title: string,
  text: string,
  urlOrData: string,
  filename: string,
  mimeType: string
) => {
  try {
    let file: File | undefined;
    
    // Try to convert urlOrData to a File object
    try {
      const res = await fetch(urlOrData);
      const blob = await res.blob();
      file = new File([blob], filename, { type: mimeType });
    } catch (e) {
      console.warn('Could not create file for sharing', e);
    }

    if (navigator.share) {
      const shareData: ShareData = { title, text };
      
      // If we successfully created a file and the browser can share it
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        shareData.files = [file];
      } else if (urlOrData.startsWith('http') && !urlOrData.startsWith('blob:')) {
        // Fallback to sharing URL if it's a web link (not a blob or data URL)
        shareData.url = urlOrData;
      } else {
        // If we can't share files and it's not a regular URL, we can't share it
        alert('Sharing files is not supported on this browser.');
        return false;
      }
      
      await navigator.share(shareData);
      return true;
    } else {
      // Fallback for browsers that don't support Web Share API
      if (urlOrData.startsWith('http') && !urlOrData.startsWith('blob:')) {
        await navigator.clipboard.writeText(urlOrData);
        alert('Link copied to clipboard!');
      } else {
        alert('Sharing is not supported on this browser.');
      }
      return false;
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error sharing:', error);
    }
    return false;
  }
};
