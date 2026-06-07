import { Capacitor } from '@capacitor/core'
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
  InterstitialAdPluginEvents,
  type AdLoadInfo,
  type AdMobBannerSize,
} from '@capacitor-community/admob'

export const ADMOB_TEST_IDS = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
}

let initialized = false
let listenersRegistered = false

function isNativeAdMobAvailable() {
  return Capacitor.isNativePlatform()
}

export async function initializeAds() {
  if (!isNativeAdMobAvailable()) {
    return 'Web preview ready. AdMob runs only inside the Android Capacitor app.'
  }

  if (!listenersRegistered) {
    listenersRegistered = true
    await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
      console.info('[AdMob] banner loaded')
    })
    await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
      console.info('[AdMob] banner size changed', size)
    })
    await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error) => {
      console.warn('[AdMob] banner failed', error)
    })
    await AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
      console.info('[AdMob] interstitial loaded', info)
    })
    await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
      console.warn('[AdMob] interstitial failed to load', error)
    })
    await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (error) => {
      console.warn('[AdMob] interstitial failed to show', error)
    })
  }

  if (!initialized) {
    await AdMob.initialize({
      initializeForTesting: true,
    })
    initialized = true
  }

  return 'AdMob initialized in Android test mode.'
}

export async function showBannerAd() {
  await initializeAds()
  if (!isNativeAdMobAvailable()) return

  await AdMob.showBanner({
    adId: ADMOB_TEST_IDS.banner,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: true,
  })
}

export async function hideBannerAd() {
  if (!isNativeAdMobAvailable()) return
  await AdMob.hideBanner()
}

export async function showInterstitialAd() {
  await initializeAds()
  if (!isNativeAdMobAvailable()) return

  await AdMob.prepareInterstitial({
    adId: ADMOB_TEST_IDS.interstitial,
    isTesting: true,
  })
  await AdMob.showInterstitial()
}
