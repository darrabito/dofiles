const stopWords = [];
const invalidCharacters = /[^\' a-zA-ZÀ-ÿ\.-]/;
const startsOrEndsWithDash = /(^|[^a-zA-ZÀ-ÿ])-|-([^a-zA-ZÀ-ÿ]|$)|(^\.)|(^\'$)/;
const invalidSuffix = / ([a-zA-ZÀ-ÿ]\.?)$/;
const invalidPrefix = /^([a-zA-ZÀ-ÿ]\.?) /;
const onlyOnceChars = ["'", '-'];

// RULES
// First and last name must be at least 2 characters
// Checks that `onlyOnceChars` are present only once
// # First name should not begin with A. or C,
// # First Name Should not allow name ending with one character + .(optional) if < 5 characters
// # Last name should not end with A. or C,
// # Last Name Should not allow name beginning with one character + .(optional) if < 5 characters


export default function isValid(value, type) {
  const nameTypeIsValid = type === 'firstname' ? validateFirstName : validateLastName;

  if ((value && value.length < 2) || !value) {
    return {error: `First and last name must be at least 2 characters`};
  }

  const validNameType = nameTypeIsValid(value);
  const inStepWords = stopWords.indexOf(value && value.toLowerCase());
  if (hasInvalidOnlyOnceChars(value) || hasInvalidCharacters(value) || validNameType.error || inStepWords > -1) {
    return inStepWords > -1 ? {error: `"${stopWords[inStepWords]}" is a reserved word and cannot be used.`} : validNameType.error ? validNameType : {error: `Name must only contain letters A-Z`};
  }
  return true;
}


function hasInvalidCharacters(value) {
  const invalidCharacter = value.match(invalidCharacters);
  const illegalDash = value.match(startsOrEndsWithDash);

  const invalid = invalidCharacter || illegalDash;
  return invalid;
}


function hasInvalidOnlyOnceChars(value) {
  // Checks that ``onlyOnceChars`` are present only once
  let valid = true;
  onlyOnceChars.forEach((char) => {
    if (value.split(char).length > 2) {
      valid = false;
    }
  });
  
  return !valid;
}


function validateFirstName(value) {
  if (value.match(invalidPrefix)) {
    return {error: 'First name has invalid prefix'};
  }

  // # First name should not begin with A. or C, ...
  if (value.length < 5 && value.match(invalidSuffix)) {
    return {error: 'First name should not begin with A. or C,'};
  }

  // # Should not allow name ending with one character + .(optional) if < 5 characters
  value = value.replace(invalidSuffix, '');
  if (value.match(/\ba\b|\.$/)) {
    return {error: 'First name has invalid suffix'};
  }

  return true;
}


function validateLastName(value) {
  // # Last name should not end with A. or C, ...
  if (value.match(invalidSuffix)) {
    return {error: 'Last name has invalid suffix'};
  }

  // # Should not allow name beginning with one character + .(optional) if < 5 characters
  if (value.length < 5) {
    if (value.match(invalidPrefix)) {
      return {error: 'Last Name has invalid prefix'};
    }
  }

  value = value.replace(invalidPrefix, '');
  value = value.replace(/ (jr|sr)\.?$/, '');
  if (value.match(/\ba\b|\.$/)) {
    return {error: 'Last Name has invalid suffix'};
  }

  return true;
}

