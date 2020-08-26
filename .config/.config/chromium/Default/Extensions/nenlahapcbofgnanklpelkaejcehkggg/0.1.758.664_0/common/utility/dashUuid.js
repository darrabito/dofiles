export default function dashUuid(str) {
  if (str && !str.includes('-')) {
    const arr = str.split('');
    [20, 16, 12, 8].forEach(index => arr.splice(index, 0, '-'));
    return arr.join('');
  } else {
    return str;
  }
}
