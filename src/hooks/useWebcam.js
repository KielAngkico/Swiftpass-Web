import { useState, useEffect, useRef } from "react";

export const useWebcam = (showToast) => {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream when webcam becomes active
  useEffect(() => {
    if (isWebcamActive && stream && videoRef.current) {
      console.log("🔄 UseEffect: Attaching stream");
      videoRef.current.srcObject = stream;
    }
  }, [isWebcamActive, stream]);

  const startWebcam = async () => {
    try {
      console.log("🎥 Requesting camera access...");
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: "user"
        } 
      });
      
      console.log("✅ Camera access granted", mediaStream);
      
      setStream(mediaStream);
      setIsWebcamActive(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          console.log("📹 Attaching stream to video element", videoRef.current);
          videoRef.current.srcObject = mediaStream;
          
          videoRef.current.play().then(() => {
            console.log("▶️ Video playing");
          }).catch(err => {
            console.error("❌ Video play error:", err);
          });
        } else {
          console.error("❌ Video ref is null");
        }
      }, 100);
      
    } catch (err) {
      console.error("❌ Error accessing webcam:", err);
      showToast({ message: "Failed to access webcam. Please check permissions.", type: "error" });
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsWebcamActive(false);
  };

  const capturePhoto = (onCapture) => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "captured-photo.jpg", { type: "image/jpeg" });
        const preview = canvas.toDataURL('image/jpeg');
        
        onCapture(file, preview);
        stopWebcam();
        showToast({ message: "Photo captured successfully!", type: "success" });
      }, 'image/jpeg', 0.95);
    }
  };

  return {
    isWebcamActive,
    videoRef,
    canvasRef,
    startWebcam,
    stopWebcam,
    capturePhoto
  };
};