import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navigation-bar" aria-label="ناوبری اصلی">
      <a
        routerLink="/"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
        class="nav-item"
      >
        <div class="icon-wrapper">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24"
            viewBox="0 -960 960 960"
            width="24"
            fill="currentColor"
          >
            <path
              d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"
            />
          </svg>
        </div>
        <span class="label">خانه</span>
      </a>

      <a routerLink="/quiz" routerLinkActive="active" class="nav-item">
        <div class="icon-wrapper">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24"
            viewBox="0 -960 960 960"
            width="24"
            fill="currentColor"
          >
            <path
              d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm-40-200h80v-240h-80v240Zm40 120q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Z"
            />
          </svg>
        </div>
        <span class="label">بازی</span>
      </a>

      <a routerLink="/1v1" routerLinkActive="active" class="nav-item highlight-item">
        <div class="icon-wrapper badge-parent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24"
            viewBox="0 -960 960 960"
            width="24"
            fill="currentColor"
          >
            <path
              d="M180-200q-42 0-71-29t-29-71v-360q0-42 29-71t71-29h600q42 0 71 29t29 71v360q0 42-29 71t-71 29H180Zm0-80h600v-360H180v360Zm100-60h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80Zm370-40q17 0 28.5-11.5T690-420q0-17-11.5-28.5T650-460q-17 0-28.5 11.5T610-420q0 17 11.5 28.5T650-380Zm60-120q17 0 28.5-11.5T750-540q0-17-11.5-28.5T710-580q-17 0-28.5 11.5T670-540q0 17 11.5 28.5T710-500ZM180-280v-360 360Z"
            />
          </svg>
          <span class="live-dot" title="آنلاین"></span>
        </div>
        <span class="label">رقابت</span>
      </a>

      <a routerLink="/profile" routerLinkActive="active" class="nav-item">
        <div class="icon-wrapper">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24"
            viewBox="0 -960 960 960"
            width="24"
            fill="currentColor"
          >
            <path
              d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"
            />
          </svg>
        </div>
        <span class="label">پروفایل</span>
      </a>
    </nav>
  `,
  styles: [
    `
      .navigation-bar {
        display: flex;
        align-items: center;
        justify-content: space-around;
        background: rgba(22, 18, 51, 0.95);
        border-top: 1px solid var(--surface-border);
        backdrop-filter: blur(16px);
        padding: 0.5rem 0.75rem;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        height: 64px;
      }

      /* Support desktop max-width shell alignment */
      @media (min-width: 769px) {
        .navigation-bar {
          max-width: 480px;
          margin: 0 auto;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          border: 1px solid var(--surface-border);
          border-bottom: none;
        }
      }

      .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2rem;
        color: var(--text-muted);
        text-decoration: none;
        font-size: 0.75rem;
        font-weight: 500;
        flex: 1;
        padding: 0.25rem 0;
        transition:
          color var(--transition-fast),
          transform var(--transition-fast);
        position: relative;
      }

      .nav-item:hover {
        color: var(--text-main);
      }

      .nav-item.active {
        color: var(--gold-light);
        font-weight: 700;
      }

      .nav-item.active .icon-wrapper {
        color: var(--gold-light);
        transform: translateY(-2px);
      }

      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform var(--transition-fast);
      }

      .badge-parent {
        position: relative;
      }

      .live-dot {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 8px;
        height: 8px;
        background-color: var(--success);
        border-radius: 50%;
        box-shadow: 0 0 6px var(--success);
      }

      .label {
        line-height: 1;
      }
    `,
  ],
})
export class BottomNavComponent {}
