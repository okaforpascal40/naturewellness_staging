/**
 * Ambient typings for the Web Speech API's SpeechRecognition controller.
 *
 * TypeScript's bundled lib.dom.d.ts (5.8) ships the result sub-types
 * (SpeechRecognitionResult / ResultList / Alternative) but NOT the core
 * `SpeechRecognition` interface, its event types, or the (often webkit-prefixed)
 * constructor on `window`. We declare only the missing pieces here and reuse the
 * lib's existing result types, so there are no duplicate-declaration conflicts.
 *
 * This file has no imports/exports on purpose: that keeps it a global script so
 * the `Window` augmentation merges with the DOM lib's `Window` interface.
 */

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  /** e.g. "no-speech" | "not-allowed" | "service-not-allowed" | "audio-capture" | "network" | "aborted" */
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
}

interface SpeechRecognitionStatic {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionStatic;
  webkitSpeechRecognition?: SpeechRecognitionStatic;
}
