import {v4} from 'node-uuid';

export default function generateAffiliateIds() {
  const redirectId = v4();
  const clickId = redirectId.replace(/-/g, '');

  return {
    clickId,
    redirectId
  };
}
