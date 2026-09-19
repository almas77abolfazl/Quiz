import { TestBed } from '@angular/core/testing';
import { MatchSocketService } from './match-socket.service';
import { AuthService } from './auth.service';
import { of } from 'rxjs';

describe('MatchSocketService', () => {
  let service: MatchSocketService;
  let authServiceSpy: {
    getAccessToken: ReturnType<typeof vi.fn>;
    refreshToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceSpy = {
      getAccessToken: vi.fn().mockReturnValue('mock_token'),
      refreshToken: vi
        .fn()
        .mockReturnValue(of({ accessToken: 'new_token', refreshToken: 'r_token' })),
    };

    TestBed.configureTestingModule({
      providers: [MatchSocketService, { provide: AuthService, useValue: authServiceSpy }],
    });

    service = TestBed.inject(MatchSocketService);
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should initialize with disconnected state', () => {
    expect(service.connectionState()).toBe('disconnected');
  });

  it('should attempt connection with auth token', () => {
    service.connect();
    expect(authServiceSpy.getAccessToken).toHaveBeenCalled();
  });

  it('should disconnect cleanly', () => {
    service.connect();
    service.disconnect();
    expect(service.connectionState()).toBe('disconnected');
    expect(service.isConnected()).toBe(false);
  });
});
