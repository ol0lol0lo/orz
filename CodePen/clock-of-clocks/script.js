// Powered by ticktack.js: https://github.com/meodai/ticktack.js

$(document).ready(function() {
	var desenhoNumeros = [
		[   [2,3],   [2,4],   [4,3],   [1,3],   [1,1],   [1,3],   [1,3,3],   [1,1],   [1,1,3],   [1,3],   [1,1],   [1,3],   [1,2],   [2,2,4],   [1,4]    ],
		[   [2,2],   [3,4],   [1,1],   [1,1],   [1,3],   [1,1],   [1,1,1],   [1,3],   [1,1,1],   [1,1],   [1,3],   [1,1],   [2,2],   [4,1,2],   [4,4]    ],
		[   [2,2],   [2,4],   [4,3],   [1,1],   [1,1],   [1,3],   [2,2,3],   [2,4],   [1,1,4],   [1,3],   [1,1],   [1,1],   [1,2],   [2,2,4],   [4,4]    ],
		[   [2,2],   [2,4],   [4,3],   [1,1],   [1,1],   [1,3],   [2,2,2],   [2,4],   [1,3,4],   [1,1],   [1,1],   [1,3],   [2,2],   [2,2,4],   [1,4]    ],
		[   [3,3],   [1,1],   [3,3],   [1,3],   [1,1],   [1,3],   [1,1,2],   [2,4],   [1,3,4],   [1,1],   [1,1],   [1,3],   [1,1],   [1,1,1],   [1,1]    ],
		[   [2,3],   [2,4],   [4,4],   [1,3],   [1,1],   [1,1],   [1,1,2],   [2,4],   [4,3,3],   [1,1],   [1,1],   [1,3],   [2,2],   [2,2,4],   [1,4]    ],
		[   [2,3],   [2,4],   [4,4],   [1,3],   [1,1],   [1,1],   [1,2,3],   [2,4],   [3,3,4],   [1,3],   [1,1],   [1,3],   [1,2],   [2,2,4],   [1,4]    ],
		[   [2,2],   [2,4],   [3,4],   [1,1],   [1,1],   [1,3],   [1,1,1],   [1,1],   [1,1,3],   [1,1],   [1,1],   [1,3],   [1,1],   [1,1,1],   [1,1]    ],
		[   [2,3],   [2,4],   [3,4],   [1,3],   [1,1],   [1,3],   [1,2,3],   [2,4],   [1,3,4],   [1,3],   [1,1],   [1,3],   [1,2],   [2,2,4],   [1,4]    ],
		[   [2,3],   [2,4],   [3,4],   [1,3],   [1,1],   [1,3],   [1,1,2],   [2,4],   [1,3,4],   [1,1],   [1,1],   [1,3],   [2,2],   [2,2,4],   [1,4]    ]

	];
	var dom_hora = $('.container > div.numero.hora'),
		dom_minuto = $('.container > div.numero.minuto'),
		dom_segundo = $('.container > div.numero.segundo');


	var parteNumeros = [
		'.corner1',
		'.horizontal.n1',
		'.corner2',
		'.vertical.n1',
		'.um.n1',
		'.vertical.n2',
		'.t1',
		'.horizontal.n2',
		'.t2',
		'.vertical.n3',
		'.um.n2',
		'.vertical.n4',
		'.corner3',
		'.horizontal.n3',
		'.corner4'
	];



	var todosPonteiros = $('.container > div.numero > div > .ponteiro');


	function mudarNumero (dom, novoNumero) {
		$.each(parteNumeros, function(indiceParte, parte) {
			dom.filter('.dezena').children(parte).children('.ponteiro').each(function(indicePonteiro, ponteiro) {
			 	$(ponteiro).attr('class', ('ponteiro a'+desenhoNumeros[novoNumero.toString().length == 2 ? novoNumero.toString().charAt(0) : 0][indiceParte][indicePonteiro]));
			 });
			dom.filter('.unidade').children(parte).children('.ponteiro').each(function(indicePonteiro, ponteiro) {
			 	$(ponteiro).attr('class', ('ponteiro a'+desenhoNumeros[novoNumero.toString().length == 2 ? novoNumero.toString().charAt(1) : novoNumero.toString()][indiceParte][indicePonteiro]));
			 });
		});
	};

	 ticktack.on('second', function(digits){
		mudarNumero(dom_segundo, digits.getSecond().value);
  });
	 ticktack.on('minute', function(digits){
		mudarNumero(dom_minuto, digits.getMinute().value);
  });
	 ticktack.on('hour', function(digits){
		mudarNumero(dom_hora, digits.getHour().value);
  });

});