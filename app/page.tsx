'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

const DEFAULT_VAST_URL = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

export default function Home() {
  const [vastUrl, setVastUrl] = useState(DEFAULT_VAST_URL);
  const [vastXml, setVastXml] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [currentMode, setCurrentMode] = useState<'url' | 'xml'>('url');
  const [status, setStatus] = useState({ type: 'idle', text: 'Idle' });
  const [adProgress, setAdProgress] = useState('');
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: string }>>([]);
  const [playButtonDisabled, setPlayButtonDisabled] = useState(false);
  
  // Bunny.net VAST Generator states
  const [bunnyVideoUrl, setBunnyVideoUrl] = useState('');
  const [bunnyTitle, setBunnyTitle] = useState('Bunny.net Video Ad');
  const [bunnyDuration, setBunnyDuration] = useState('30');
  const [generatedVast, setGeneratedVast] = useState('');
  const [validationResults, setValidationResults] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  
  const contentVideoRef = useRef<HTMLVideoElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const logOutputRef = useRef<HTMLDivElement>(null);
  
  const adsManagerRef = useRef<any>(null);
  const adsLoaderRef = useRef<any>(null);
  const adDisplayContainerRef = useRef<any>(null);
  const adPlayingRef = useRef(false);

  const log = (message: string, type: string = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[VAST Harness] ${message}`);
  };

  useEffect(() => {
    if (logOutputRef.current) {
      logOutputRef.current.scrollTop = logOutputRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vastParam = urlParams.get('vast');
    if (vastParam) {
      setVastUrl(vastParam);
    }
    
    log('VAST Test Harness initialized', 'success');
    log('Ready to test VAST tags (URL or XML)', 'info');
  }, []);

  const switchMode = (mode: 'url' | 'xml') => {
    setCurrentMode(mode);
    log(`Switched to VAST ${mode.toUpperCase()} mode`, 'info');
  };

  const escapeXml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const generateBunnyVAST = () => {
    if (!bunnyVideoUrl.trim()) {
      alert('Please enter a Bunny.net video URL');
      log('ERROR: No video URL provided for VAST generation', 'error');
      return;
    }

    let videoId = '';
    let libraryId = '';

    const embedMatch = bunnyVideoUrl.match(/mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
    const playMatch = bunnyVideoUrl.match(/mediadelivery\.net\/play\/(\d+)\/([a-f0-9-]+)/i);

    if (embedMatch) {
      libraryId = embedMatch[1];
      videoId = embedMatch[2];
    } else if (playMatch) {
      libraryId = playMatch[1];
      videoId = playMatch[2];
    } else {
      const customMatch = bunnyVideoUrl.match(/([a-f0-9-]{36})/i);
      if (customMatch) {
        videoId = customMatch[1];
        libraryId = '1';
      } else {
        alert('Could not parse Bunny.net video URL. Please use format:\nhttps://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID');
        log('ERROR: Invalid Bunny.net URL format', 'error');
        return;
      }
    }

    log(`Generating VAST for Bunny.net video: ${videoId}`, 'info');
    log(`Library ID: ${libraryId}, Video ID: ${videoId}`, 'info');

    const duration = parseInt(bunnyDuration) || 30;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    const durationFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const mp4Url = `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}`;
    const adId = `bunny-${videoId}-${Date.now()}`;

    const vastXML = `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="4.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <Ad id="${adId}" sequence="1">
    <InLine>
      <AdSystem version="1.0">Bunny.net Stream</AdSystem>
      <AdTitle>${escapeXml(bunnyTitle)}</AdTitle>
      <Description>Video ad powered by Bunny.net Stream</Description>
      
      <Advertiser>Bunny.net</Advertiser>
      
      <Error><![CDATA[https://httpbin.org/status/200?error=[ERRORCODE]&video=${videoId}]]></Error>
      
      <Impression id="imp-1"><![CDATA[https://httpbin.org/status/200?impression=1&video=${videoId}]]></Impression>
      
      <ViewableImpression id="viewable-1">
        <Viewable><![CDATA[https://httpbin.org/status/200?viewable=1&video=${videoId}]]></Viewable>
        <NotViewable><![CDATA[https://httpbin.org/status/200?not_viewable=1&video=${videoId}]]></NotViewable>
        <ViewUndetermined><![CDATA[https://httpbin.org/status/200?view_undetermined=1&video=${videoId}]]></ViewUndetermined>
      </ViewableImpression>
      
      <Creatives>
        <Creative id="creative-${videoId}" adId="${adId}">
          <UniversalAdId idRegistry="Ad-ID">BUNNY${videoId.substring(0, 8).toUpperCase()}</UniversalAdId>
          <Linear>
            <Duration>${durationFormatted}</Duration>
            
            <skipoffset>00:00:05</skipoffset>
            
            <TrackingEvents>
              <Tracking event="start"><![CDATA[https://httpbin.org/status/200?event=start&video=${videoId}]]></Tracking>
              <Tracking event="firstQuartile"><![CDATA[https://httpbin.org/status/200?event=q1&video=${videoId}]]></Tracking>
              <Tracking event="midpoint"><![CDATA[https://httpbin.org/status/200?event=q2&video=${videoId}]]></Tracking>
              <Tracking event="thirdQuartile"><![CDATA[https://httpbin.org/status/200?event=q3&video=${videoId}]]></Tracking>
              <Tracking event="complete"><![CDATA[https://httpbin.org/status/200?event=complete&video=${videoId}]]></Tracking>
              
              <Tracking event="mute"><![CDATA[https://httpbin.org/status/200?mute=1&video=${videoId}]]></Tracking>
              <Tracking event="unmute"><![CDATA[https://httpbin.org/status/200?unmute=1&video=${videoId}]]></Tracking>
              <Tracking event="pause"><![CDATA[https://httpbin.org/status/200?pause=1&video=${videoId}]]></Tracking>
              <Tracking event="resume"><![CDATA[https://httpbin.org/status/200?resume=1&video=${videoId}]]></Tracking>
              <Tracking event="fullscreen"><![CDATA[https://httpbin.org/status/200?fullscreen=1&video=${videoId}]]></Tracking>
              <Tracking event="exitFullscreen"><![CDATA[https://httpbin.org/status/200?exit_fullscreen=1&video=${videoId}]]></Tracking>
              <Tracking event="skip"><![CDATA[https://httpbin.org/status/200?skip=1&video=${videoId}]]></Tracking>
              
              <Tracking event="loaded"><![CDATA[https://httpbin.org/status/200?loaded=1&video=${videoId}]]></Tracking>
            </TrackingEvents>
            
            <VideoClicks>
              <ClickThrough id="click-1"><![CDATA[https://bunny.net]]></ClickThrough>
              <ClickTracking id="track-1"><![CDATA[https://httpbin.org/status/200?click=1&video=${videoId}]]></ClickTracking>
            </VideoClicks>
            
            <MediaFiles>
              <MediaFile id="bunny-mp4-${videoId}" delivery="progressive" type="video/mp4" width="1920" height="1080" codec="H.264" bitrate="2000" scalable="true" maintainAspectRatio="true">
                <![CDATA[${mp4Url}]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`;

    setGeneratedVast(vastXML);
    setVastXml(vastXML);

    log('VAST generated successfully', 'success');
    log(`Video ID: ${videoId}, Duration: ${duration}s`, 'info');

    alert('VAST generated successfully! You can now:\n1. Copy the XML from the textarea\n2. Click "Validate VAST" to check compliance\n3. Switch to VAST XML mode and test it');
  };

  const validateVAST = () => {
    const xmlInput = generatedVast || vastXml;

    if (!xmlInput.trim()) {
      alert('Please generate or paste VAST XML first');
      log('ERROR: No VAST XML to validate', 'error');
      return;
    }

    log('=== Starting VAST validation ===', 'info');
    setShowValidation(true);

    const results: string[] = [];
    let errorCount = 0;
    let warningCount = 0;

    const addResult = (type: string, message: string, details: string = '') => {
      if (type === 'error') errorCount++;
      if (type === 'warning') warningCount++;

      const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠';
      const color = type === 'success' ? '#34a853' : type === 'error' ? '#ea4335' : '#fbbc04';
      const bgColor = type === 'success' ? '#0a2e0a' : type === 'error' ? '#2e0a0a' : '#2e2a0a';

      results.push(`<div style="margin-bottom: 10px; padding: 8px; background: ${bgColor}; border-left: 3px solid ${color}; border-radius: 3px;">
        <span style="color: ${color}; font-weight: bold;">${icon} ${message}</span>
        ${details ? `<div style="color: #999; font-size: 11px; margin-top: 5px; margin-left: 20px;">${details}</div>` : ''}
      </div>`);

      log(`[VALIDATION] ${message}`, type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success');
    };

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlInput, 'text/xml');

      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        addResult('error', 'XML Parsing Failed', parseError.textContent || '');
        setValidationResults(results.join(''));
        return;
      }

      addResult('success', 'XML is well-formed');

      const vastElement = xmlDoc.querySelector('VAST');
      if (!vastElement) {
        addResult('error', 'Missing VAST root element', 'Document must have a <VAST> root element');
      } else {
        addResult('success', 'VAST root element found');

        const version = vastElement.getAttribute('version');
        if (!version) {
          addResult('warning', 'VAST version not specified', 'Recommended to specify version attribute');
        } else {
          addResult('success', `VAST version: ${version}`);

          if (!['2.0', '3.0', '4.0', '4.1', '4.2'].includes(version)) {
            addResult('warning', `Unusual VAST version: ${version}`, 'Standard versions are 2.0, 3.0, 4.0, 4.1, 4.2');
          }
        }
      }

      const ads = xmlDoc.querySelectorAll('Ad');
      if (ads.length === 0) {
        addResult('error', 'No Ad elements found', 'VAST must contain at least one <Ad> element');
      } else {
        addResult('success', `Found ${ads.length} Ad element(s)`);

        ads.forEach((ad, index) => {
          const adId = ad.getAttribute('id');
          if (!adId) {
            addResult('warning', `Ad #${index + 1}: Missing id attribute`, 'Recommended for tracking');
          } else {
            addResult('success', `Ad #${index + 1}: ID = "${adId}"`);
          }

          const inline = ad.querySelector('InLine');
          const wrapper = ad.querySelector('Wrapper');

          if (!inline && !wrapper) {
            addResult('error', `Ad #${index + 1}: Must contain InLine or Wrapper element`);
          } else {
            const type = inline ? 'InLine' : 'Wrapper';
            addResult('success', `Ad #${index + 1}: Type = ${type}`);

            const adContent = inline || wrapper;
            if (!adContent) return;

            const adSystem = adContent.querySelector('AdSystem');
            if (!adSystem) {
              addResult('error', `Ad #${index + 1}: Missing required <AdSystem> element`);
            } else if (!adSystem.textContent?.trim()) {
              addResult('error', `Ad #${index + 1}: <AdSystem> is empty`);
            } else {
              addResult('success', `Ad #${index + 1}: AdSystem = "${adSystem.textContent.trim()}"`);
            }

            const adTitle = adContent.querySelector('AdTitle');
            if (!adTitle) {
              addResult('error', `Ad #${index + 1}: Missing required <AdTitle> element`);
            } else if (!adTitle.textContent?.trim()) {
              addResult('warning', `Ad #${index + 1}: <AdTitle> is empty`);
            } else {
              addResult('success', `Ad #${index + 1}: AdTitle = "${adTitle.textContent.trim()}"`);
            }

            const impressions = adContent.querySelectorAll('Impression');
            if (impressions.length === 0) {
              addResult('error', `Ad #${index + 1}: Missing <Impression> element(s)`, 'At least one impression URL is required');
            } else {
              addResult('success', `Ad #${index + 1}: Found ${impressions.length} Impression(s)`);

              impressions.forEach((imp, impIndex) => {
                const url = imp.textContent?.trim() || '';
                if (!url) {
                  addResult('error', `Ad #${index + 1}: Impression #${impIndex + 1} is empty`);
                } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  addResult('warning', `Ad #${index + 1}: Impression #${impIndex + 1} should use HTTP(S)`, `URL: ${url.substring(0, 50)}...`);
                }
              });
            }

            const creatives = adContent.querySelector('Creatives');
            if (!creatives) {
              addResult('error', `Ad #${index + 1}: Missing <Creatives> element`);
            } else {
              const creativeList = creatives.querySelectorAll('Creative');
              if (creativeList.length === 0) {
                addResult('error', `Ad #${index + 1}: No <Creative> elements found`);
              } else {
                addResult('success', `Ad #${index + 1}: Found ${creativeList.length} Creative(s)`);

                creativeList.forEach((creative, creativeIndex) => {
                  const linear = creative.querySelector('Linear');

                  if (linear) {
                    const duration = linear.querySelector('Duration');
                    if (!duration) {
                      addResult('error', `Ad #${index + 1}, Creative #${creativeIndex + 1}: Linear creative missing <Duration>`);
                    } else {
                      const durationText = duration.textContent?.trim() || '';
                      const durationPattern = /^\d{2}:\d{2}:\d{2}(\.\d{3})?$/;
                      if (!durationPattern.test(durationText)) {
                        addResult('error', `Ad #${index + 1}, Creative #${creativeIndex + 1}: Invalid duration format`, `Expected HH:MM:SS, got "${durationText}"`);
                      } else {
                        addResult('success', `Ad #${index + 1}, Creative #${creativeIndex + 1}: Duration = ${durationText}`);
                      }
                    }

                    const mediaFiles = linear.querySelector('MediaFiles');
                    if (!mediaFiles) {
                      addResult('error', `Ad #${index + 1}, Creative #${creativeIndex + 1}: Missing <MediaFiles>`);
                    } else {
                      const mediaFileList = mediaFiles.querySelectorAll('MediaFile');
                      if (mediaFileList.length === 0) {
                        addResult('error', `Ad #${index + 1}, Creative #${creativeIndex + 1}: No <MediaFile> elements`);
                      } else {
                        addResult('success', `Ad #${index + 1}, Creative #${creativeIndex + 1}: Found ${mediaFileList.length} MediaFile(s)`);

                        mediaFileList.forEach((mediaFile, mfIndex) => {
                          const delivery = mediaFile.getAttribute('delivery');
                          const type = mediaFile.getAttribute('type');
                          const url = mediaFile.textContent?.trim() || '';

                          if (!delivery) {
                            addResult('warning', `MediaFile #${mfIndex + 1}: Missing delivery attribute`);
                          }
                          if (!type) {
                            addResult('warning', `MediaFile #${mfIndex + 1}: Missing type attribute`);
                          } else {
                            addResult('success', `MediaFile #${mfIndex + 1}: Type = ${type}, Delivery = ${delivery || 'N/A'}`);
                          }
                          if (!url) {
                            addResult('error', `MediaFile #${mfIndex + 1}: Empty media URL`);
                          } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            addResult('warning', `MediaFile #${mfIndex + 1}: URL should use HTTP(S)`);
                          }
                        });
                      }
                    }

                    const videoClicks = linear.querySelector('VideoClicks');
                    if (videoClicks) {
                      const clickThrough = videoClicks.querySelector('ClickThrough');
                      if (clickThrough) {
                        addResult('success', `Ad #${index + 1}, Creative #${creativeIndex + 1}: ClickThrough URL present`);
                      }
                    } else {
                      addResult('warning', `Ad #${index + 1}, Creative #${creativeIndex + 1}: No VideoClicks element`, 'Optional but recommended');
                    }
                  }
                });
              }
            }
          }
        });
      }

      const totalChecks = results.length;
      if (errorCount === 0 && warningCount === 0) {
        addResult('success', `✓ VAST Validation Passed! (${totalChecks} checks completed)`, 'Your VAST tag is compliant and ready to use');
      } else if (errorCount === 0) {
        addResult('warning', `Validation completed with ${warningCount} warning(s)`, 'VAST is functional but could be improved');
      } else {
        addResult('error', `Validation failed with ${errorCount} error(s) and ${warningCount} warning(s)`, 'Please fix the errors before using this VAST tag');
      }

    } catch (error: any) {
      addResult('error', 'Validation exception occurred', error.message);
    }

    setValidationResults(results.join(''));
    log(`=== Validation Complete: ${errorCount} errors, ${warningCount} warnings ===`,
      errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success');
  };

  const loadGeneratedVAST = () => {
    if (!generatedVast.trim()) {
      alert('Please generate VAST first');
      log('ERROR: No generated VAST to load', 'error');
      return;
    }

    switchMode('xml');
    setVastXml(generatedVast);

    log('Generated VAST loaded into player', 'success');
    log('Switched to VAST XML mode - click "Play Ad" to test', 'info');
  };

  const playAd = () => {
    let vastUrlValue = null;
    let vastXmlValue = null;

    if (currentMode === 'url') {
      vastUrlValue = vastUrl.trim();
      if (!vastUrlValue) {
        log('ERROR: Please enter a VAST URL', 'error');
        alert('Please enter a VAST URL');
        return;
      }
    } else {
      vastXmlValue = vastXml.trim();
      if (!vastXmlValue) {
        log('ERROR: Please paste VAST XML', 'error');
        alert('Please paste VAST XML');
        return;
      }
      if (!vastXmlValue.includes('<VAST') && !vastXmlValue.includes('<vmap:VMAP')) {
        log('WARNING: Input does not appear to be valid VAST XML', 'warning');
        if (!confirm('Input does not appear to be valid VAST XML. Continue anyway?')) {
          return;
        }
      }
    }

    if (adPlayingRef.current) {
      log('Ad already playing, ignoring request', 'warning');
      return;
    }

    if (contentUrl && contentVideoRef.current && contentVideoRef.current.src !== contentUrl) {
      contentVideoRef.current.src = contentUrl;
      log(`Content video source updated: ${contentUrl}`, 'info');
    }

    setStatus({ type: 'loading', text: 'Loading ad...' });
    log('=== Starting ad request ===', 'info');

    if (currentMode === 'url') {
      log('Mode: VAST URL', 'info');
      log(`VAST URL: ${vastUrlValue}`, 'info');
    } else {
      log('Mode: Direct VAST XML', 'info');
      log(`XML Length: ${vastXmlValue?.length} characters`, 'info');
    }

    setPlayButtonDisabled(true);
    initializeIMA(vastUrlValue, vastXmlValue);
  };

  const initializeIMA = (vastUrlValue: string | null, vastXmlValue: string | null) => {
    if (!window.google || !window.google.ima) {
      log('ERROR: Google IMA SDK not loaded', 'error');
      setStatus({ type: 'error', text: 'IMA SDK not loaded' });
      setPlayButtonDisabled(false);
      return;
    }

    try {
      const google = window.google;
      
      adDisplayContainerRef.current = new google.ima.AdDisplayContainer(
        adContainerRef.current,
        contentVideoRef.current
      );

      adDisplayContainerRef.current.initialize();
      log('AdDisplayContainer initialized', 'success');

      adsLoaderRef.current = new google.ima.AdsLoader(adDisplayContainerRef.current);

      adsLoaderRef.current.addEventListener(
        google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        onAdsManagerLoaded,
        false
      );
      adsLoaderRef.current.addEventListener(
        google.ima.AdErrorEvent.Type.AD_ERROR,
        onAdError,
        false
      );

      const videoContainer = document.getElementById('video-container');
      const containerWidth = videoContainer?.clientWidth || 640;
      const containerHeight = videoContainer?.clientHeight || 360;

      const adsRequest = new google.ima.AdsRequest();
      adsRequest.linearAdSlotWidth = containerWidth;
      adsRequest.linearAdSlotHeight = containerHeight;
      adsRequest.nonLinearAdSlotWidth = containerWidth;
      adsRequest.nonLinearAdSlotHeight = Math.floor(containerHeight / 3);

      if (vastUrlValue) {
        adsRequest.adTagUrl = vastUrlValue;
        log('Requesting ads from URL via IMA SDK...', 'info');
      } else if (vastXmlValue) {
        adsRequest.adsResponse = vastXmlValue;
        log('Loading ads from XML via IMA SDK...', 'info');
      }

      adsLoaderRef.current.requestAds(adsRequest);

    } catch (error: any) {
      log(`CRITICAL ERROR: ${error.message}`, 'error');
      setStatus({ type: 'error', text: 'Initialization failed' });
      setPlayButtonDisabled(false);
    }
  };

  const onAdsManagerLoaded = (adsManagerLoadedEvent: any) => {
    log('AdsManager loaded successfully', 'success');

    const google = window.google;
    const adsRenderingSettings = new google.ima.AdsRenderingSettings();
    adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

    adsManagerRef.current = adsManagerLoadedEvent.getAdsManager(
      contentVideoRef.current,
      adsRenderingSettings
    );

    attachAdsManagerListeners();

    try {
      const videoContainer = document.getElementById('video-container');
      const containerWidth = videoContainer?.clientWidth || 640;
      const containerHeight = videoContainer?.clientHeight || 360;

      adsManagerRef.current.init(
        containerWidth,
        containerHeight,
        google.ima.ViewMode.NORMAL
      );

      log(`Initialized IMA with dimensions: ${containerWidth}x${containerHeight}`, 'info');

      adsManagerRef.current.setVolume(0);
      if (contentVideoRef.current) {
        contentVideoRef.current.muted = true;
      }

      adsManagerRef.current.start();
      log('Ad playback started', 'success');
      adPlayingRef.current = true;
      setStatus({ type: 'playing', text: 'Ad playing...' });

    } catch (adError: any) {
      log(`ERROR starting ad: ${adError.message}`, 'error');
      setStatus({ type: 'error', text: 'Ad start failed' });
      setPlayButtonDisabled(false);
    }
  };

  const attachAdsManagerListeners = () => {
    const google = window.google;
    const events = [
      google.ima.AdEvent.Type.LOADED,
      google.ima.AdEvent.Type.STARTED,
      google.ima.AdEvent.Type.FIRST_QUARTILE,
      google.ima.AdEvent.Type.MIDPOINT,
      google.ima.AdEvent.Type.THIRD_QUARTILE,
      google.ima.AdEvent.Type.COMPLETE,
      google.ima.AdEvent.Type.PAUSED,
      google.ima.AdEvent.Type.RESUMED,
      google.ima.AdEvent.Type.SKIPPED,
      google.ima.AdEvent.Type.CLICK,
      google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
      google.ima.AdEvent.Type.VOLUME_CHANGED,
      google.ima.AdEvent.Type.VOLUME_MUTED
    ];

    events.forEach(eventType => {
      adsManagerRef.current.addEventListener(eventType, onAdEvent);
    });

    adsManagerRef.current.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      onAdError
    );
  };

  const onAdEvent = (adEvent: any) => {
    const ad = adEvent.getAd();
    const type = adEvent.type;
    const google = window.google;

    switch (type) {
      case google.ima.AdEvent.Type.LOADED:
        log('[EVENT] LOADED - Ad loaded successfully', 'event');
        if (ad) {
          log(`  → Title: ${ad.getTitle()}`, 'info');
          log(`  → Duration: ${ad.getDuration()}s`, 'info');
          log(`  → Skip offset: ${ad.getSkipTimeOffset()}`, 'info');
          log(`  → Ad ID: ${ad.getAdId()}`, 'info');
        }
        break;

      case google.ima.AdEvent.Type.STARTED:
        log('[EVENT] STARTED - Ad playback started', 'event');
        if (ad) {
          const mediaUrl = ad.getMediaUrl();
          if (mediaUrl) {
            log(`  → Media URL: ${mediaUrl}`, 'info');
          }
        }
        setStatus({ type: 'playing', text: 'Ad playing...' });
        break;

      case google.ima.AdEvent.Type.FIRST_QUARTILE:
        log('[EVENT] FIRST_QUARTILE (25%) - Tracking fired', 'event');
        setAdProgress('25%');
        break;

      case google.ima.AdEvent.Type.MIDPOINT:
        log('[EVENT] MIDPOINT (50%) - Tracking fired', 'event');
        setAdProgress('50%');
        break;

      case google.ima.AdEvent.Type.THIRD_QUARTILE:
        log('[EVENT] THIRD_QUARTILE (75%) - Tracking fired', 'event');
        setAdProgress('75%');
        break;

      case google.ima.AdEvent.Type.COMPLETE:
        log('[EVENT] COMPLETE (100%) - Ad finished', 'event');
        setAdProgress('100%');
        break;

      case google.ima.AdEvent.Type.CLICK:
        log('[EVENT] CLICK - User clicked ad', 'event');
        break;

      case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
        log('[EVENT] ALL_ADS_COMPLETED - All ads finished', 'success');
        log('=== Ad session completed successfully ===', 'success');
        setStatus({ type: 'idle', text: 'Completed' });
        adPlayingRef.current = false;
        setPlayButtonDisabled(false);
        break;

      case google.ima.AdEvent.Type.SKIPPED:
        log('[EVENT] SKIPPED - Ad was skipped', 'warning');
        break;

      case google.ima.AdEvent.Type.PAUSED:
        log('[EVENT] PAUSED', 'event');
        break;

      case google.ima.AdEvent.Type.RESUMED:
        log('[EVENT] RESUMED', 'event');
        break;

      default:
        log(`[EVENT] ${type}`, 'event');
    }
  };

  const onAdError = (adErrorEvent: any) => {
    const error = adErrorEvent.getError();
    const errorCode = error.getErrorCode();
    const errorMessage = error.getMessage();

    log(`[ERROR] Ad Error ${errorCode}: ${errorMessage}`, 'error');
    log(`  → Error type: ${error.getType()}`, 'error');
    log(`  → VAST error code: ${error.getVastErrorCode()}`, 'error');
    log(`  → Inner error: ${error.getInnerError()}`, 'error');

    setStatus({ type: 'error', text: `Error ${errorCode}` });
    adPlayingRef.current = false;
    setPlayButtonDisabled(false);

    if (adsManagerRef.current) {
      adsManagerRef.current.destroy();
    }
  };

  const reset = () => {
    log('=== Resetting player ===', 'info');

    if (adsManagerRef.current) {
      adsManagerRef.current.destroy();
      adsManagerRef.current = null;
    }

    if (adsLoaderRef.current) {
      adsLoaderRef.current.destroy();
      adsLoaderRef.current = null;
    }

    adPlayingRef.current = false;
    setStatus({ type: 'idle', text: 'Idle' });
    setAdProgress('');
    setPlayButtonDisabled(false);

    if (contentVideoRef.current) {
      contentVideoRef.current.load();
    }

    log('Player reset complete', 'success');
  };

  const copyShareLink = () => {
    if (currentMode === 'xml') {
      alert('Share link is only available for VAST URL mode.\n\nFor XML mode, copy the XML and share it directly.');
      log('Share link not available in XML mode', 'warning');
      return;
    }

    if (!vastUrl.trim()) {
      alert('Please enter a VAST URL first');
      return;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?vast=${encodeURIComponent(vastUrl)}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      log('Share link copied to clipboard', 'success');
      alert('Share link copied to clipboard!');
    }).catch(err => {
      log(`Failed to copy: ${err}`, 'error');
      alert(`Share URL:\n${shareUrl}`);
    });
  };

  return (
    <div className="container">
      <h1>VAST Test Harness</h1>
      <p className="subtitle">Google IMA HTML5 SDK - Validate VAST tags, track events, and debug media playback</p>

      {/* Bunny.net VAST Generator */}
      <div className="panel" style={{ marginBottom: '20px' }}>
        <h2>Bunny.net VAST Generator</h2>
        <div className="info-box">
          <strong>Generate VAST:</strong> Enter your Bunny.net video URL to automatically generate a compliant VAST 4.0 tag.
        </div>

        <div className="input-group">
          <label htmlFor="bunny-video-url">Bunny.net Video URL</label>
          <input
            type="text"
            id="bunny-video-url"
            value={bunnyVideoUrl}
            onChange={(e) => setBunnyVideoUrl(e.target.value)}
            placeholder="https://iframe.mediadelivery.net/embed/YOUR_LIBRARY_ID/YOUR_VIDEO_ID"
          />
        </div>

        <div className="input-group">
          <label htmlFor="bunny-video-title">Ad Title (optional)</label>
          <input
            type="text"
            id="bunny-video-title"
            value={bunnyTitle}
            onChange={(e) => setBunnyTitle(e.target.value)}
            placeholder="My Video Ad"
          />
        </div>

        <div className="input-group">
          <label htmlFor="bunny-duration">Duration (seconds)</label>
          <input
            type="text"
            id="bunny-duration"
            value={bunnyDuration}
            onChange={(e) => setBunnyDuration(e.target.value)}
            placeholder="30"
          />
        </div>

        <div className="controls">
          <button onClick={generateBunnyVAST} className="btn-orange">Generate VAST</button>
          <button onClick={validateVAST} className="btn-green">Validate VAST</button>
          <button onClick={loadGeneratedVAST} className="btn-purple">Load & Test</button>
        </div>

        <div className="input-group" style={{ marginTop: '15px' }}>
          <label htmlFor="generated-vast">Generated VAST XML</label>
          <textarea
            id="generated-vast"
            value={generatedVast}
            onChange={(e) => setGeneratedVast(e.target.value)}
            rows={10}
            placeholder="Generated VAST will appear here..."
          />
        </div>

        {showValidation && (
          <div id="validation-results" style={{ marginTop: '15px' }}>
            <label style={{ color: '#34a853' }}>Validation Results</label>
            <div
              id="validation-output"
              dangerouslySetInnerHTML={{ __html: validationResults }}
            />
          </div>
        )}
      </div>

      <div className="grid">
        {/* Left Column: Player & Controls */}
        <div>
          <div className="panel">
            <h2>Video Player</h2>
            <div className="status-bar">
              <div>
                <span className={`status-indicator status-${status.type}`}></span>
                <span>{status.text}</span>
              </div>
              <div>{adProgress}</div>
            </div>
            <div className="video-wrapper">
              <div id="video-container">
                <video ref={contentVideoRef} id="content-video" controls muted>
                  <source src="https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.mp4" type="video/mp4" />
                </video>
                <div ref={adContainerRef} id="ad-container"></div>
              </div>
            </div>
            <div className="controls">
              <button onClick={playAd} disabled={playButtonDisabled} className="btn-primary">Play Ad</button>
              <button onClick={reset} className="btn-secondary">Reset</button>
              <button onClick={copyShareLink} className="btn-success">Copy Share Link</button>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '20px' }}>
            <h2>Configuration</h2>
            <div className="info-box">
              <strong>Quick Start:</strong> Paste your VAST tag URL or XML below and click &quot;Play Ad&quot;. Use &quot;Copy Share Link&quot; to share this test with others.
            </div>

            <div className="mode-selector">
              <button
                className={`mode-btn ${currentMode === 'url' ? 'active' : ''}`}
                onClick={() => switchMode('url')}
              >
                VAST URL
              </button>
              <button
                className={`mode-btn ${currentMode === 'xml' ? 'active' : ''}`}
                onClick={() => switchMode('xml')}
              >
                VAST XML
              </button>
            </div>

            {currentMode === 'url' ? (
              <div className="input-group">
                <label htmlFor="vast-url">VAST Tag URL</label>
                <textarea
                  id="vast-url"
                  value={vastUrl}
                  onChange={(e) => setVastUrl(e.target.value)}
                  placeholder="https://example.com/vast.xml&#x0a;or&#x0a;https://pubads.g.doubleclick.net/gampad/ads?iu=/..."
                  rows={3}
                />
              </div>
            ) : (
              <div className="input-group">
                <label htmlFor="vast-xml">VAST XML Response</label>
                <textarea
                  id="vast-xml"
                  value={vastXml}
                  onChange={(e) => setVastXml(e.target.value)}
                  placeholder='<VAST version="3.0">&#x0a;  <Ad id="...">&#x0a;    <InLine>&#x0a;      ...&#x0a;    </InLine>&#x0a;  </Ad>&#x0a;</VAST>'
                  rows={8}
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="content-url">Content Video URL (optional)</label>
              <input
                type="text"
                id="content-url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://example.com/content.mp4"
              />
            </div>
            <div className="network-hints">
              <h3>Network Monitoring (use DevTools Network tab):</h3>
              <ul>
                <li>VAST XML request (initial + wrappers)</li>
                <li>Media file requests (MP4, WebM, HLS .m3u8)</li>
                <li>Impression tracking pixels</li>
                <li>Quartile beacons (25%, 50%, 75%, 100%)</li>
                <li>Click-through URLs (if clicked)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Debug Log */}
        <div>
          <div className="panel">
            <h2>Event Log & Debug Output</h2>
            <div ref={logOutputRef} id="log-output">
              {logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <span className="log-timestamp">[{log.timestamp}]</span>
                  <span className={`log-${log.type}`}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
