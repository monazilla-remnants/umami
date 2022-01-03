import path from 'path';
import requestIp from 'request-ip';
import { browserName, detectOS } from '@monazilla-remnants/detect-browser';
import isLocalhost from 'is-localhost-ip';
import maxmind from 'maxmind';

import {
  DESKTOP_OS,
  MOBILE_OS,
  DESKTOP_SCREEN_WIDTH,
  LAPTOP_SCREEN_WIDTH,
  MOBILE_SCREEN_WIDTH,
} from './constants';

let lookup;

export function getIpAddress(req) {
  // Custom header
  if (req.headers[process.env.CLIENT_IP_HEADER]) {
    return req.headers[process.env.CLIENT_IP_HEADER];
  }
  // Cloudflare
  else if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }

  return requestIp.getClientIp(req);
}

export function getDevice(screen, browser, os) {
  const width = screen ? screen.split('x')[0] : undefined;

  if (DESKTOP_OS.includes(os)) {
    if (os === 'Chrome OS' || (width && width < DESKTOP_SCREEN_WIDTH)) {
      return 'laptop';
    }

    return 'desktop';
  }

  if (MOBILE_OS.includes(os)) {
    if (os === 'Amazon OS' || (width && width > MOBILE_SCREEN_WIDTH)) {
      return 'tablet';
    }

    return 'mobile';
  }

  if (width && width >= DESKTOP_SCREEN_WIDTH) return 'desktop';
  if (width && width >= LAPTOP_SCREEN_WIDTH) return 'laptop';
  if (width && width >= MOBILE_SCREEN_WIDTH) return 'tablet';
  if (width) return 'mobile';

  return;
}

export async function getCountry(req, ip) {
  // Cloudflare
  if (req.headers['cf-ipcountry']) {
    return req.headers['cf-ipcountry'];
  }

  // Ignore local ips
  if (await isLocalhost(ip)) {
    return;
  }

  // Database lookup
  if (!lookup) {
    lookup = await maxmind.open(path.resolve('./public/geo/GeoLite2-Country.mmdb'));
  }

  const result = lookup.get(ip);

  return result?.country?.iso_code;
}

export async function getClientInfo(req, { screen }) {
  const userAgent = req.headers['user-agent'];
  const ip = getIpAddress(req);
  const country = await getCountry(req, ip);
  const browser = browserName(userAgent);
  const os = detectOS(userAgent);
  const device = getDevice(screen, browser, os);

  return { userAgent, browser, os, ip, country, device };
}
