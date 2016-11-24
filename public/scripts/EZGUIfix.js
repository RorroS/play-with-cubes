// The fix.js file.
EZGUI.utils.loadJSON = function(url, cb, crossOrigin) {
  if (crossOrigin === void 0) {
    crossOrigin = true;
  }
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4) {
      var jsonContent = JSON.parse(xmlhttp.responseText);
      cb(jsonContent);
    }
  };
  xmlhttp.open('GET', url, crossOrigin);
  xmlhttp.send();
};

EZGUI.utils.loadXML = function loadXML(url, cb, crossOrigin) {
  if (crossOrigin === void 0) {
    crossOrigin = true;
  }
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4) {
      var xmlDoc;
      if (window['DOMParser']) {
        var parser = new DOMParser();
        xmlDoc = parser.parseFromString(xmlhttp.responseText, 'text/xml');
      } else {
        xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
        xmlDoc.async = false;
        xmlDoc.loadXML(xmlhttp.responseText);
      }
      cb(xmlDoc);
    }
  };
  xmlhttp.open('GET', url, crossOrigin);
  xmlhttp.send();
};
