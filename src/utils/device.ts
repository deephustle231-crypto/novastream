import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isDesktop: boolean;
  isTouch: boolean;
}

/**
 * useDeviceDetect Hook
 * Detects whether the client is on a mobile device or desktop environment
 * using navigator.userAgent, touch points, and responsive window width (< 768px).
 */
export function useDeviceDetect(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isDesktop: true, isTouch: false };
    }

    const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || navigator.vendor || (window as any).opera || '') : '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    const isUserAgentMobile = mobileRegex.test(userAgent);
    const isSmallScreen = window.innerWidth < 768;
    const hasTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
    
    const isMobile = isUserAgentMobile || (isSmallScreen && hasTouch) || isSmallScreen;

    return {
      isMobile,
      isDesktop: !isMobile,
      isTouch: hasTouch
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || navigator.vendor || (window as any).opera || '') : '';
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
      const isUserAgentMobile = mobileRegex.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      const hasTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

      const isMobile = isUserAgentMobile || isSmallScreen;

      setDeviceInfo({
        isMobile,
        isDesktop: !isMobile,
        isTouch: hasTouch
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}
