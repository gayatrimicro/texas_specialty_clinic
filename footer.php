<div class="footer-header__background gradient-background">
   <div class="container">
      <ul class="footer-header ">
         <!-- <li class="footer-header__item  footer-header__item--105"><a href="">Home</a></li> -->
         <li class="footer-header__item  footer-header__item--105 mobile-menu-item"><a href="">About Us</a></li>
         <li class="footer-header__item  footer-header__item--105 mobile-menu-item"><a href="">Treatment &amp; Services</a></li>
         <li class="footer-header__item  footer-header__item--106 mobile-menu-item"><a href="">Testing &amp; Vaccination</a></li>
         <!-- <li class="footer-header__item  footer-header__item--3513"><a href="">Request an appointment</a></li> -->
         <li class="footer-header__item  footer-header__item--3513 mobile-menu-item"><a href="">Meet Our Providers</a></li>
         <li class="footer-header__item  footer-header__item--3513 mobile-menu-item"><a href="">Contact Us</a></li>
      </ul>
   </div>
</div>
<style type="text/css">
  @media (max-width: 600px){
    .mob-display{
      display: none;
    }
    .mobile-menu-item{
      margin-top: 10px;
    }
  }
</style>
<footer class="footer">
   <div class="container flexComponent flexComponent--row">
      <div class="footer__col" style="width: 100% !important">
         <div class="footer__block flexComponent flexComponent--row">
            <div class="footer__col">
               <p class="footer__textarea">
                  13988 Diplomat Drive, <br />
                  Suite 100 Farmers Branch, <br />
                  TX 75234<br />
      
               </p>
            </div>
            <div class="footer__col">
               <p class="footer__textarea">
                  <a href="mailto:info@TexasSpecialtyClinic.com ">info@TexasSpecialtyClinic.com<img src="http://spacegm.com/texas-specialty-clinic/assets/images/btn-icon-arrow-right.png" style="margin-left: 5px;"> </a> </br>
                  Phone: <a href="tel:469-545-8645">469-545-8645  <img src="http://spacegm.com/texas-specialty-clinic/assets/images/btn-icon-arrow-right.png" style="margin-left: 5px;"> </a><br>
                  Fax:<a href="fax:(214) 888-4450"> (214) 888-4450 <img src="http://spacegm.com/texas-specialty-clinic/assets/images/btn-icon-arrow-right.png" style="margin-left: 5px;"> </a>
               </p>
               <ul class="social-icons social-icons--pink">
                  <li class="social-icons__item">
                     <a href="" target="_blank" class="social-icons__link"><i class="fab fa-twitter"></i></a>
                  </li>
                  <li class="social-icons__item">
                     <a href="" target="_blank" class="social-icons__link"><i class="fab fa-facebook"></i></a>
                  </li>
                  <!--  <li class="social-icons__item">
                     <a href="" target="_blank" class="social-icons__link"><i class="fab fa-youtube"></i></a>
                     </li> -->
                  <li class="social-icons__item">
                     <a href="" target="_blank" class="social-icons__link"><i class="fab fa-instagram"></i></a>
                  </li>
               </ul>
            </div>
            <div class="footer__col">
              <h5>Appointments</h5>
               <p class="footer__textarea">

                  <a href="">Book, reschedule an appointment <img src="http://spacegm.com/texas-specialty-clinic/assets/images/btn-icon-arrow-right.png" style="margin-left: 5px;"> </a>
               </p>
               
            </div>
            <div class="footer__col">
               <h5>Free condoms</h5>
               <p class="footer__textarea">

                  <a href="">Get free condoms <img src="http://spacegm.com/texas-specialty-clinic/assets/images/btn-icon-arrow-right.png" style="margin-left: 5px;"> </a>
               </p>
            </div>
         </div>
      </div>
      <!--  <div class="footer__col">
         <div class="footer__block flexComponent flexComponent--row footer__block--right">
            <img src="assets/images/footer.png" class="footer__ctaImage">
            <div class="footer__signup">
               <h2 class="footer__signupTitle">News & Updates</h2>
               <p class="footer__signupText">Subscribe to our newsletter for all things</p>
               <form action="" method="post" id="form2" name="mc-embedded-subscribe-form" class="validate">
                  <input required type="email" value="" name="EMAIL" class="required footer__signupInput" id="mce-EMAIL" placeholder="Email Address">
                  <button class="footer_signupButton button button--pink">Subscribe</button><div id="submsg" style="display:none;margin-top:5px;color:white;">Subscribed to our newsletter</div>
               </form>
            </div>
         </div>
         </div> -->
   </div>

</footer>
<div class="company-footer gradient-background">
   <div class="container company-footer__container">
      <ul class="company-footer__list mob-display">
         <li class="company-footer__listItem"></li>
         <li class="company-footer__listItem"></li>
         <li class="company-footer__listItem"></li>
      </ul>
      <ul class="company-footer__list">
         <li class="company-footer__listItem">Web designed by <a href="https://ibridgedigital.com/" target="_blank" class="company-footer__listLink">iBridge Digital</a></li>
      </ul>
   </div>
</div>
<script>
   jQuery(document).ready(function($) {
                             
                             $('#form2').submit(function(event) {
                              
   
                               /* stop form from submitting normally */
                               event.preventDefault();
   
                               /* get the action attribute from the <form action=""> element */
                               var $form = $( this ),
                                   //url = $form.attr( 'action' );
                                   url='subscribe.php';
                                  
                               /* Send the data using post with element id name and name2*/
                               var posting = $.post( url, { email: $('#mce-EMAIL').val() } );
                              
                               /* Alerts the results */
                               posting.done(function( data ) {
                                 
                                 $("#submsg").css("display", "block");
                                
                                 var form = document.getElementById("form2");
                                   form.reset();
                                 
                               });
   
                             });
   
                             
                            });
</script>