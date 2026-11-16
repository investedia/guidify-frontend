#!/usr/bin/env python3
"""Check assets/globe/companies.json.

Usage:
  python3 tools/validate_companies.py            # report problems; unverified records are warnings
  python3 tools/validate_companies.py --release  # also fail if any record is not verified

Exit code 0 = no errors, 1 = errors found.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'assets', 'globe', 'companies.json')
SECTORS = {'Software & AI', 'Finance & Fintech', 'Commerce', 'Media & Entertainment', 'Infrastructure & Technology', 'Consumer & Industry'}
STATUSES = {'verified', 'needs-review', 'disputed', 'unsupported'}
REQUIRED = ['id', 'name', 'sector', 'founded', 'city', 'country', 'lat', 'lon', 'coordPrecision', 'status']
URL = re.compile(r'^https://[^\s/$.?#].[^\s]*$')

def main():
    release = '--release' in sys.argv
    data = json.load(open(DATA, encoding='utf-8'))
    errors, warnings, seen = [], [], set()
    for i, c in enumerate(data):
        tag = c.get('id') or f'#{i}'
        for f in REQUIRED:
            if c.get(f) in (None, ''):
                errors.append(f'{tag}: missing {f}')
        if c.get('id') in seen:
            errors.append(f'{tag}: duplicate id')
        seen.add(c.get('id'))
        if c.get('id') and not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', c['id']):
            errors.append(f'{tag}: id must be a lowercase slug')
        if c.get('sector') not in SECTORS:
            errors.append(f'{tag}: unknown sector {c.get("sector")!r}')
        if c.get('status') not in STATUSES:
            errors.append(f'{tag}: unknown status {c.get("status")!r}')
        lat, lon = c.get('lat'), c.get('lon')
        if not (isinstance(lat, (int, float)) and -90 <= lat <= 90 and isinstance(lon, (int, float)) and -180 <= lon <= 180):
            errors.append(f'{tag}: invalid coordinates {lat}, {lon}')
        if not (isinstance(c.get('founded'), int) and 1500 <= c['founded'] <= 2100):
            errors.append(f'{tag}: invalid founded year {c.get("founded")!r}')
        for u in c.get('sources') or []:
            if not URL.match(u):
                errors.append(f'{tag}: invalid source URL {u!r}')
        if c.get('logo'):
            if not os.path.isfile(os.path.join(ROOT, c['logo'])):
                errors.append(f'{tag}: logo file not found {c["logo"]}')
            if not c.get('logoSource'):
                errors.append(f'{tag}: logo has no logoSource')
        if c.get('status') == 'verified' and not c.get('sources'):
            errors.append(f'{tag}: verified but has no sources')
        if c.get('status') != 'verified':
            (errors if release else warnings).append(f'{tag}: status is {c.get("status")} (not verified)')
    print(f'{len(data)} records, {len(errors)} errors, {len(warnings)} warnings')
    for e in errors: print('ERROR  ', e)
    if warnings: print(f'WARNING  {len(warnings)} records are not verified yet (use --release to fail on this)')
    return 1 if errors else 0

if __name__ == '__main__':
    sys.exit(main())
