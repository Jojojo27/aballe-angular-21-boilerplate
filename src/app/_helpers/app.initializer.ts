import { AccountService } from '@app/_services';

export function appInitializer(accountService: AccountService) {
  return () => {
    return new Promise(resolve => {
      // attempt to refresh token on app start up to auto reconnect to the server
      accountService.refreshToken().subscribe({
        next: () => resolve(true),
        error: () => resolve(true)
      });
    });
  };
}
