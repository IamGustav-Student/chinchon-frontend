import { Component, Input } from '@angular/core';

export interface AvatarConfig {
  skin:  string;
  hair:  string;
  style: 'short' | 'long' | 'curly' | 'bald';
  eyes:  string;
  acc:   'none' | 'glasses';
}

const DEFAULT_CFG: AvatarConfig = {
  skin: '#f5c88a', hair: '#4a2800', style: 'short', eyes: '#4a7abf', acc: 'none',
};

@Component({
  selector: 'app-avatar-svg',
  templateUrl: './avatar-svg.component.html',
  styleUrl: './avatar-svg.component.scss',
})
export class AvatarSvgComponent {
  @Input() set avatar(v: string) {
    try {
      if (v?.startsWith('{')) {
        this.cfg = { ...DEFAULT_CFG, ...JSON.parse(v) };
        return;
      }
    } catch {}
    this.cfg = { ...DEFAULT_CFG };
  }

  cfg: AvatarConfig = { ...DEFAULT_CFG };
}
