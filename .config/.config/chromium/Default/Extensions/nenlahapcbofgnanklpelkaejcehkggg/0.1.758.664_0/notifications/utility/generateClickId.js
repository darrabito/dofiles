import uuid from 'node-uuid';
export default function generateClickId() {
  return uuid.v4().replace(/-/g, '');
}
