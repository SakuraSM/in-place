export const HOME_CREATE_PARAM = 'create';
export const HOME_CREATE_VALUE = '1';
export const HOME_CREATE_ROUTE = `/?${HOME_CREATE_PARAM}=${HOME_CREATE_VALUE}`;

export function buildHomeCreateRoute(pathname: string, search: string) {
  if (pathname !== '/') {
    return HOME_CREATE_ROUTE;
  }

  const params = new URLSearchParams(search);
  params.set(HOME_CREATE_PARAM, HOME_CREATE_VALUE);
  const nextSearch = params.toString();
  return nextSearch ? `/?${nextSearch}` : HOME_CREATE_ROUTE;
}
