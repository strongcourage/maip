//import crypto from 'crypto';

/**
 *
 * @param {Object} obj Object to be updated
 * @param {String} path Path to be updated
 * @param {Value} value the new value to be updated
 */
const updateObjectByPath = (obj, path, value) => {
  let stack = path.split(".");
  while (stack.length > 1) {
    // Not at the end of the path
    let key = stack.shift();
    if (key.indexOf("[") > 0) {
      // Contains array index
      const array = key.split("[");
      key = array[0];
      let index = array[1].replace("]", "");
      if (!obj[key]) {
        // Create a new array if it does not exist
        obj[key] = [];
      }
      if (obj[key].length === 0) {
        // Empty array
        index = 0;
      } else if (obj[key].length <= index || index < 0) {
        // index out of range
        index = obj[key].length;
      }
      if (!obj[key][index]) {
        obj[key].push({});
        // throw Error(`ERROR: Invalid data path: ${path} in object ${JSON.stringify(obj)}`);
      }
      obj = obj[key][index];
    } else {
      if (!obj[key]) {
        // Create a new path if it does not exist
        obj[key] = {};
      }
      obj = obj[key];
    }
  }
  let lastKey = stack.shift();
  // At the end of the path
  if (lastKey.indexOf("[") > 0) {
    // Contains array index
    const array = lastKey.split("[");
    lastKey = array[0];
    let index = array[1].replace("]", "");
    if (value === null) {
      // Remove an element
      if (obj[lastKey] && obj[lastKey][index]) {
        obj[lastKey].splice(index, 1);
      }
    } else {
      // Add an element
      if (!obj[lastKey]) {
        // Create a new array if it does not exist
        obj[lastKey] = [];
      }
      if (obj[lastKey].length === 0) {
        // Empty array
        index = 0;
      } else if (obj[lastKey].length <= index || index < 0) {
        // index out of range
        index = obj[lastKey].length;
      }
      if (!obj[lastKey][index]) {
        obj[lastKey].push(value);
        // throw Error(`ERROR: Invalid data path: ${path} in object ${JSON.stringify(obj)}`);
      } else {
        obj[lastKey][index] = value;
      }
    }
  } else {
    // Not contains array index
    obj[lastKey] = value;
  }
};

const deepCloneObject = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Add new element into array
 * @param {Array} array The array to be added
 * @param {Object} newElement New element to be updated or added
 */
const addNewElementToArray = (array, newElement) => {
  let found = false;
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    if (element.id === newElement.id) {
      // Found the element - update
      array[index] = { ...newElement };
      // array.splice(index, 1);
      // array.push(newElement);
      found = true;
      break;
    }
  }
  if (!found) {
    array.push(newElement);
  }
  return array;
};

const removeElementFromArray = (array, elmId) => {
  let isDeleted = false;
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    if (element.id === elmId) {
      array.splice(index, 1);
      isDeleted = true;
      break;
    }
  }
  if (!isDeleted) {
    console.log(`[ERROR] Cannot find the element: ${elmId}`);
    return null;
  }
  return array;
};

const getCreatedTimeFromFileName = (fileName) => {
  const array = fileName.split("_");
  let timeString = array[array.length - 1].replace(".log", "");
  return new Date(Number(timeString));
};

const getLastURLPath = (url) => {
  const array = url.split("/");
  return array[array.length - 1];
};

const isDataGenerator = () => {
  return window.location.pathname.indexOf("data-generator") === 1;
};

const getQuery = (qname) => {
  const query = new URLSearchParams(window.location.search);
  return query.get(qname);
};

/**
 * Get the last path in the URL /this-is-the-last-path?not-this-part
 */
const getLastPath = () => {
  const array = window.location.pathname.split('/');
  let lastPath = array[array.length - 1];
  if (lastPath) {
    lastPath = lastPath.split('?')[0]; // Remove query path
  }
  return lastPath;
}

// last-path (id = 1), right-before-last-path (id = 2)
 const getBeforeLastPath = (id) => {
  const array = window.location.pathname.split('/');
  return array[array.length - id];
}


export {
  getQuery,
  isDataGenerator,
  getLastURLPath,
  updateObjectByPath,
  addNewElementToArray,
  removeElementFromArray,
  getCreatedTimeFromFileName,
  deepCloneObject,
  getLastPath,
  getBeforeLastPath,
};
