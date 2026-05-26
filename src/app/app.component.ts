import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    document.body.classList.add('arys-native');
    this.bindNativeSafeAreaInsets();

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
      } catch {
        // noop: plugin no disponible en web
      }
    })();
  }

  /** Ajusta insets reales en Android (env() suele devolver 0 en WebView). */
  private bindNativeSafeAreaInsets(): void {
    const root = document.documentElement;
    const minBottomPx = 56;

    const apply = (): void => {
      const vv = window.visualViewport;
      let bottom = minBottomPx;
      let top = 28;

      if (vv) {
        const bottomInset = Math.round(
          window.innerHeight - vv.height - vv.offsetTop
        );
        const topInset = Math.round(vv.offsetTop);
        if (bottomInset > 0) {
          bottom = Math.max(bottomInset, minBottomPx);
        }
        if (topInset > 0) {
          top = topInset;
        }
      }

      root.style.setProperty('--arys-safe-bottom', `${bottom}px`);
      root.style.setProperty('--arys-safe-top', `${top}px`);
      root.style.setProperty(
        '--arys-tabbar-clearance',
        `calc(118px + ${bottom}px)`
      );
      root.style.setProperty(
        '--arys-header-clearance',
        `calc(60px + ${top}px)`
      );
    };

    apply();
    window.visualViewport?.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('scroll', apply);
    window.addEventListener('orientationchange', () => setTimeout(apply, 150));
  }
}
