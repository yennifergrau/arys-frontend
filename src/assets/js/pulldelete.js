(function (window, $) {
    var startX, startY, pullX, pullY, moveX, moveY, rem, btn, threshold;
    var _this;

    function PullDelete($element, callback) {
        _this = this;
        rem = parseFloat($('html').css('font-size').replace('px', ''));
        btn = 2.5 * rem;
        threshold = btn / 2;

        if ($element instanceof $ && $element.hasClass('pull_delete')) {
            $element.append('<i class="pd_btn"></i>');
            this.addPullListener($element, callback);
        }
    }

    PullDelete.prototype = {
        constructor: PullDelete,
        addPullListener: function ($element, callback) {
            $element.on('touchstart', function (e) {
                startX = e.originalEvent.targetTouches[0].pageX;
                startY = e.originalEvent.targetTouches[0].pageY;
                $(this).removeClass('trans');
                $(this).siblings().addClass('trans').css({ transform: 'translateX(0)' });
            });

            $element.on('touchmove', function (e) {
                pullX = e.originalEvent.targetTouches[0].pageX;
                pullY = e.originalEvent.targetTouches[0].pageY;
                moveX = (startX - pullX) * 0.8;
                moveY = (startY - pullY) * 0.8;

                if (Math.abs(moveY) > Math.abs(moveX)) {
                    return;
                }

                if (moveX <= btn) {
                    $(this).css({ transform: 'translateX(-' + moveX + 'px)' });
                }
            });

            $element.on('touchend', function (e) {
                var trans = _this.transverseShift($(this));
                var viewTrans = trans >= threshold && trans < btn ? btn : 0;

                $(this).addClass('trans').css({ transform: 'translateX(-' + 80 + 'px)' });
                
                // Add Toggle Class ==
                $(this).toggleClass('active');
                $(".pull_delete").not(this).removeClass("active");

                if (e.target.className == 'pd_btn') {
                    e.stopPropagation();
                    e.preventDefault();

                    if (callback) {
                        callback($element);
                    }
                }
            });
        },
        transverseShift: function ($element) {
            if (!($element instanceof $)) {
                return;
            }

            var trans = $element.css('transform');

            if (trans.indexOf('matrix') > -1) {
                return Math.abs(trans.split(',')[4]) || 0;
            } else {
                return Math.abs(trans.replace(/[^\d\.]/g, '')) || 0;
            }
        }
    };

    $.fn.extend({
        pulldelete: function (callback) {
            this.each(function () {
                new PullDelete($(this), callback);
            });
            return this;
        }
    });

    window.PullDelete = PullDelete;
})(window, jQuery);
