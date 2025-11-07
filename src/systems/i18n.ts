/**
 * SURFACE DEBUT - Internationalization
 * 다국어 지원 시스템
 */

import type { Language, CopyData } from '@core/types';
import copyData from '@config/copy.json';

export class I18n {
  private currentLanguage: Language;
  private copy: CopyData;

  constructor(initialLanguage: Language = 'KR') {
    this.copy = copyData as CopyData;
    this.currentLanguage = this.detectLanguage(initialLanguage);
  }

  /**
   * 브라우저 언어 감지
   */
  private detectLanguage(fallback: Language): Language {
    if (typeof window === 'undefined') return fallback;

    const browserLang = navigator.language.split('-')[0].toUpperCase();
    const supportedLanguages = Object.keys(this.copy) as Language[];

    if (supportedLanguages.includes(browserLang as Language)) {
      return browserLang as Language;
    }

    return fallback;
  }

  /**
   * 현재 언어 반환
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * 언어 변경
   */
  setLanguage(lang: Language): void {
    if (!this.copy[lang]) {
      console.warn(`[i18n] Language not supported: ${lang}`);
      return;
    }
    this.currentLanguage = lang;
  }

  /**
   * 텍스트 가져오기
   */
  t(key: string): string {
    const text = this.copy[this.currentLanguage]?.[key];
    if (!text) {
      console.warn(`[i18n] Missing translation: ${key} (${this.currentLanguage})`);
      return key;
    }
    return text;
  }

  /**
   * 특정 언어의 텍스트 가져오기
   */
  tLang(key: string, lang: Language): string {
    const text = this.copy[lang]?.[key];
    if (!text) {
      console.warn(`[i18n] Missing translation: ${key} (${lang})`);
      return key;
    }
    return text;
  }

  /**
   * 모든 지원 언어 반환
   */
  getSupportedLanguages(): Language[] {
    return Object.keys(this.copy) as Language[];
  }
}

export const i18n = new I18n();
