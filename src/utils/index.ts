export const smartTrim = (str: string, length: number, delim: any, appendix: any) => {
  if (str.length <= length) return str;

  // var trimedStr = str.substr(0, length + delim.length);
  var trimedStr = str.slice(0, length + delim.length);

  var lastDelimIndex = trimedStr.lastIndexOf(delim);
  // if (lastDelimIndex >= 0) trimedStr = trimedStr.substr(0, lastDelimIndex);
  if (lastDelimIndex >= 0) trimedStr = trimedStr.slice(0, lastDelimIndex);

  if (trimedStr) trimedStr += appendix;
  return trimedStr
}