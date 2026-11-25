import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Image as ImageIcon,
  RefreshCw,
  Move,
} from 'lucide-react';
import { createImage, drawCropPreview, getCroppedImg } from '../utils/cropImage';

export default function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onApply,
  onChangeImage,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loadedImage, setLoadedImage] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [cropError, setCropError] = useState('');

  const previewCanvasRef = useRef(null);

  // Reset controls when a new image is loaded
  useEffect(() => {
    if (imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropError('');

      createImage(imageSrc)
        .then((img) => setLoadedImage(img))
        .catch(() => setLoadedImage(null));
    } else {
      setLoadedImage(null);
    }
  }, [imageSrc]);

  // Handle keyboard ESC to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isApplying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isApplying, onClose]);

  // Callback when crop moves or zoom changes in Cropper
  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // Update real-time live circular preview canvas
  useEffect(() => {
    if (loadedImage && croppedAreaPixels && previewCanvasRef.current) {
      drawCropPreview(loadedImage, croppedAreaPixels, previewCanvasRef.current);
    }
  }, [loadedImage, croppedAreaPixels]);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, Math.round((prev + 0.2) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(1, Math.round((prev - 0.2) * 10) / 10));
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  // Submit and export cropped image
  const handleApplyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsApplying(true);
      setCropError('');

      const { file } = await getCroppedImg(imageSrc, croppedAreaPixels, 512);
      await onApply(file);
    } catch (err) {
      setCropError(err.message || 'Failed to apply cropped photo. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="avatar-crop-backdrop"
      onClick={() => {
        if (!isApplying) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div
        className="avatar-crop-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="avatar-crop-header">
          <div>
            <h2 id="crop-modal-title" className="avatar-crop-title">
              Crop & Position Photo
            </h2>
            <p className="avatar-crop-subtitle">
              Drag to reposition and zoom to frame your headshot perfectly.
            </p>
          </div>
          <button
            type="button"
            className="crop-close-btn"
            onClick={onClose}
            disabled={isApplying}
            aria-label="Close cropper"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error notification if crop or save fails */}
        {cropError && (
          <div className="crop-error-banner" role="alert">
            <span>{cropError}</span>
          </div>
        )}

        {/* Main Body: Cropper Workspace & Live Preview */}
        <div className="avatar-crop-body">
          {/* Main Cropper Container */}
          <div className="crop-workspace-wrap">
            <div className="crop-cropper-stage">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="crop-drag-hint">
              <Move size={13} aria-hidden="true" />
              <span>Drag to reposition image</span>
            </div>
          </div>

          {/* Sidebar / Preview & Reset Column */}
          <div className="crop-preview-sidebar">
            <div className="crop-preview-card">
              <span className="crop-preview-label">Live Circular Preview</span>
              <div className="crop-preview-circle-wrapper">
                <canvas
                  ref={previewCanvasRef}
                  width={96}
                  height={96}
                  className="crop-preview-canvas"
                  aria-label="Live circular avatar preview"
                />
              </div>
              <span className="crop-preview-hint">512 × 512 px circular avatar</span>
            </div>

            <div className="crop-sidebar-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm w-full"
                onClick={handleReset}
                disabled={isApplying}
                title="Reset zoom and position"
              >
                <RotateCcw size={13} />
                <span>Reset View</span>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm w-full"
                onClick={onChangeImage}
                disabled={isApplying}
                title="Select a different photo file"
              >
                <ImageIcon size={13} />
                <span>Choose Another</span>
              </button>
            </div>
          </div>
        </div>

        {/* Zoom Controls Bar */}
        <div className="crop-zoom-bar">
          <button
            type="button"
            className="crop-zoom-btn"
            onClick={handleZoomOut}
            disabled={zoom <= 1 || isApplying}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>

          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="crop-zoom-slider"
            disabled={isApplying}
            aria-label="Zoom scale"
          />

          <button
            type="button"
            className="crop-zoom-btn"
            onClick={handleZoomIn}
            disabled={zoom >= 3 || isApplying}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>

          <span className="crop-zoom-percentage">{Math.round(zoom * 100)}%</span>
        </div>

        {/* Modal Actions Footer */}
        <div className="avatar-crop-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isApplying}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyCrop}
            disabled={isApplying || !croppedAreaPixels}
          >
            {isApplying ? (
              <>
                <RefreshCw size={15} className="spin-icon" />
                <span>Saving Photo...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Apply Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
