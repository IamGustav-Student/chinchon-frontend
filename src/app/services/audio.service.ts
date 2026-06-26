import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Archivos de audio requeridos en public/assets/sounds/:
//   draw.mp3      — robar carta del mazo
//   discard.mp3   — descartar carta
//   your-turn.mp3 — notificación de turno
//   chinchon.mp3  — declarar chinchón
//   win.mp3       — ganar la partida
//   lose.mp3      — perder la partida
//   join.mp3      — jugador se une a la mesa

@Injectable({ providedIn: 'root' })
export class AudioService {
  private platformId = inject(PLATFORM_ID);
  private cache = new Map<string, HTMLAudioElement>();
  private muted = false;

  private play(file: string) {
    if (!isPlatformBrowser(this.platformId) || this.muted) return;
    try {
      let audio = this.cache.get(file);
      if (!audio) {
        audio = new Audio(`/assets/sounds/${file}`);
        audio.volume = 0.5;
        this.cache.set(file, audio);
      }
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }

  draw()     { this.play('draw.mp3'); }
  discard()  { this.play('discard.mp3'); }
  yourTurn() { this.play('your-turn.mp3'); }
  chinchon() { this.play('chinchon.mp3'); }
  win()      { this.play('win.mp3'); }
  lose()     { this.play('lose.mp3'); }
  join()     { this.play('join.mp3'); }

  toggleMute() { this.muted = !this.muted; return this.muted; }
  isMuted()    { return this.muted; }
}
