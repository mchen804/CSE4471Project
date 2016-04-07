var table = document.createElement('table');
chrome.history.search({text: '', maxResults: 10}, function(data) {
    data.forEach(function(page) {
    	var tr = document.createElement('tr');
    	var td1 = document.createElement('td');
    	var td2 = document.createElement('td');
    	var text1 = document.createTextNode(page.url);
    	var xmlhttp = new XMLHttpRequest();
    	xmlhttp.onreadystatechange = function() {
   		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        var myArr = JSON.parse(xmlhttp.responseText);
        var text2 = document.createTextNode(myArr[2]);
        td2.appendChild(text2);
   		 }
		};
    	xmlhttp.open("GET", "http://api.mywot.com/0.4/public_link_json2?hosts="+"www.google.com"+"&key=<API KEY HERE>", true);
    	xmlhttp.send();
		td1.appendChild(text1);
		tr.appendChild(td1);
		tr.appendChild(td2);
        table.appendChild(tr);
    });
    document.body.appendChild(table);
});