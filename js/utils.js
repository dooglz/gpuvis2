/* global d3 */
// converts a Jquery selecotr to a d3 selctor
function jqtod3(jq) {
  return d3.selectAll(jq.toArray());
}

function d3tojq(d3s) {
  return $(d3s[0]);
}

function exists(i) {
  return (i !== undefined && i !== null);
}

function empty(str) {
  if (str.length === 0) {
    return true;
  }
  if (str.length === 1 && str.charCodeAt(0) < 46) {
    return true;
  }
}

// checks to see if string begins with "yyyy-mm-dd" or "yyyy-m-dd" and 01 < mm < 12
// and that the whole string can form a valid date
function isDate(datestring) {
  var dateRegEx = /^\d{4}-([1-9]|0\d|1[0-2])-([0-3][1-9]|[1-9])/;
  return ((dateRegEx.test(datestring)) && !isNaN(Date.parse(datestring)));
}

function isNumber(numberString) {
  // will return true on "1234","0.123","1234.1234" and "1234.1234f",
  var numberRegEx = /^(([0-9]+)||([0-9]+\.[0-9]+f?))$/;
  return ((numberRegEx.test(numberString)) && (!isNaN(parseFloat(numberString))));
}

function randRange(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function echo(e) {
  console.log(e);
}