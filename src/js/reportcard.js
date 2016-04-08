var table = document.createElement('table');
chrome.history.search({text: '', maxResults: 10}, function(data) {
    data.forEach(function(page) {
    	var host = getLocation(currentTab.url);
    	var tr = document.createElement('tr');
    	var td1 = document.createElement('td');
    	var td2 = document.createElement('td');
    	var text1 = document.createTextNode(host.hostname);
    	var xmlhttp = new XMLHttpRequest();
    	xmlhttp.onreadystatechange = function() {
   		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        var myArr = JSON.parse(xmlhttp.responseText);
        var categories = myArr[host.hostname]["categories"];
        trustworthiness = myArr[host.hostname]["0"][0];
         $('#trustworthiness').html(trustworthiness);
          if(trustworthiness >= 60){
                    $('#trustworthiness').addClass("label-success");
                } else if(trustworthiness >= 40){
                    $('#trustworthiness').addClass("label-warning");
                } else {
                    $('#trustworthiness').addClass("label-danger");
                }
                $('#categories').html(listCategories(categories));
        var text2 = document.createTextNode(myArr[host.hostname]["0"][0]);
        td2.appendChild(text2);
   		 }
		};
    	xmlhttp.open("GET", "http://api.mywot.com/0.4/public_link_json2?hosts="+host.hostname+"&key=aac42146ef84f207eda6922c397768d57043c5f5", true);
    	xmlhttp.send();
    	$('#hostname').html(host.hostname);
		td1.appendChild(text1);
		tr.appendChild(td1);
		tr.appendChild(td2);
        table.appendChild(tr);
    });
    document.body.appendChild(table);
});