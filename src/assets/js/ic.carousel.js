/** 	=========================
	Template Name 	 : eBike
	Author			 : IndianCoder
	Version			 : 1.0
	File Name		 : custom.js

	Core script to handle the entire theme and core functions
**/

/* JavaScript Document */
jQuery(document).ready(function() {
    'use strict';
	
    // Get Started ==========
	if(jQuery('.get-started').length > 0){
		var swiper = new Swiper(".get-started", {
			speed: 1000,
			parallax: true,
			slidesPerView: 1,
			spaceBetween: 30,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
				renderBullet: function (index, className) {
					return `<span class="${className}">${(index + 1).toString().padStart(2, '0')}</span>`;
				},
				
			},
		});
	
		var swiper2 = new Swiper(".get-started2", {
			speed: 1000,
			spaceBetween: 0,
			slidesPerView: 1,
			effect: "fade",
			loop: true,
		});
	
		// Connect the two swipers
		swiper.controller.control = swiper2;
		swiper2.controller.control = swiper;
	}
	
	// CategorySlide ==========
	if(jQuery('.category-slide').length > 0){
		var swiper = new Swiper('.category-slide', {
			speed: 500,
			spaceBetween: 5,
			slidesPerView: "auto",
		});
	}
	
	// PaymentCardSwiper ==========
	if(jQuery('.payment-card-swiper').length > 0){
		var swiper = new Swiper('.payment-card-swiper', {
			speed: 200,
			slidesPerView: "1.2",
			spaceBetween: 10,
		});
	}
});
/* Document .ready END */