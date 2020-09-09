<style type="text/css">
        body{
          top:0px !important;
        }
        .goog-te-banner-frame{
          display: none !important;
        }
      </style>

      <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
<script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
<script type="text/javascript">   
      function googleTranslateElementInit() {
        new google.translate.TranslateElement({pageLanguage: 'en', includedLanguages: 'en,es',  autoDisplay: true, multilanguagePage: false}, 'google_translate_element');
        }

    </script>
    <style>
body {font-family: Arial, Helvetica, sans-serif;}

/* The Modal (background) */
.modal {
  display: none; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  padding-top: 100px; /* Location of the box */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0); /* Fallback color */
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
}

/* Modal Content */
.modal-content {
  background-color: #470b68;
  margin: auto;
  padding: 20px;
  border: 1px solid #470b68;
  width: 60%;
  border-radius: 5px;
  color: #fff;
}

/* The Close Button */
.close {
  color: #aaaaaa;
  float: right;
  font-size: 50px;
  margin-top: -30px;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: #fff;
  text-decoration: none;
  cursor: pointer;
}

input[type=text], input[type=email], input[type=number], select, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
}

label {
  padding: 12px 12px 12px 0;
  display: inline-block;
}

input[type=submit] {
  background-color: #4CAF50;
  padding: 12px 20px;
  border: none;
  cursor: pointer;
  float: right;
}

input[type=submit]:hover {
  background-color: #45a049;
}

/*.container {
  border-radius: 5px;
  padding: 20px;
  margin-top:30px;
}*/

.col-25 {
  float: left;
  width: 16%;
  margin-top: 6px;
}

.col-75 {
  float: left;
  width: 80%;
  margin-top: 6px;
}

/* Clear floats after the columns */
.row:after {
  content: "";
  display: table;
  clear: both;
}
.google-lang{
  display: inline-block;

}
#myBtn{
    display: inline-block;
    margin-top: 0px;
    padding: 15px 10px;
    font-size: 14px;
}
#myBtn-header{
    display: inline-block;
    margin-top: 0px;
    padding: 15px 10px;
    font-size: 14px;
}
.header-req-btn{
   margin: 0 30px 10px 0;
}
.btn-align{
  margin-right: 2rem;
  margin-top:0px;
  padding: 15px 10px;
  font-size: 14px;
}
/* Responsive layout - when the screen is less than 600px wide, make the two columns stack on top of each other instead of next to each other */
@media screen and (max-width: 600px) {
  .col-25, .col-75, input[type=submit] {
    width: 100%;
    margin-top: 0;
  }
  .modal-content {
  
    width: 95%;
  }
  .google-lang{
    display: none !important;
    
  }
  #myBtn{
    display: inline-block;
        margin-top: 0px;
    padding: 15px 20px;
    font-size: 15px;
  }
  #myBtn-header{
    display: inline-block;
    margin-top: 0px;
    padding: 15px 10px;
    font-size: 10px;
}
  .header-req-btn{
     margin: 0px;
  }
  .arrow-image-req{
    display: none;
  }
  .modal{
    padding-top: 50px;
  }
  .btn-align{
    margin-right: 0rem;
    margin-top:0px;
    padding: 15px 10px;
    font-size: 14px;
  }
}
</style>
<script type="text/javascript">
                      $(document).ready(function(){

                          var serviceList = {2: "auto-accident-treatment::PrEP & PEP Access::http://spacegm.com/texas-specialty-clinic/assets/images/menu1-1.jpg", 
                                          3: "diagnostic-services::STD's::http://spacegm.com/texas-specialty-clinic/assets/images/menu1-2.jpg",
                                          4: "hiv::HIV / Aids::http://spacegm.com/texas-specialty-clinic/assets/images/menu1-3.jpg",
                                          5:"occupational-health-care::Psychiatric Care::http://spacegm.com/texas-specialty-clinic/assets/images/menu1-4.jpg",
                                          5:"occupational-health-care::Hormonal Therapy::http://spacegm.com/texas-specialty-clinic/assets/images/menu1-4.jpg"
                                          

                                        };

                           


                          //sub menu 1 image changer
                          $('#header_submenu_1 li:eq(1)').css('background-image','url(http://texasspecialtyclinic.com/assets/images/menu1.jpg)');
                          $('#header_submenu_1 li').not("#header_submenu_1 li:eq(1)").on("mouseover", function(event){
                              var listIndex =  $(this).index();
                              var view_content = serviceList[listIndex].split("::");
                              $('#header_submenu_1 li:eq(1)').css('background-image','url('+view_content[2]+')');
                              $('#header_submenu_1 li:eq(1)').html('<a href="'+view_content[0]+'/">'+view_content[1]);
                              // alert($(this).closest('ul').attr('id'));
                          });

                          
                      });
                  </script>

<script type="text/javascript">
                      $(document).ready(function(){

                          var serviceList2 = {2: "auto-accident-treatment::HIV Testing::http://spacegm.com/texas-specialty-clinic/assets/images/menu1.jpg", 
                                          3: "diagnostic-services::Chlamydia &amp; Gonorrhea Testing::http://spacegm.com/texas-specialty-clinic/assets/images/menu2.jpg",
                                          4: "iv-infusion::Syphilis Testing::http://spacegm.com/texas-specialty-clinic/assets/images/menu3.jpg",
                                          5: "iv-infusion::Herpes Testing::http://spacegm.com/texas-specialty-clinic/assets/images/menu3.jpg",
                                          6: "iv-infusion::Hepatitis Testing::http://spacegm.com/texas-specialty-clinic/assets/images/menu3.jpg",
                                          7: "iv-infusion::Complete Blood Count::http://spacegm.com/texas-specialty-clinic/assets/images/menu3.jpg",
                                          8:"iv-infusion::Urinalysis Testing::http://spacegm.com/texas-specialty-clinic/assets/images/menu5.jpg",
                                          9:"iv-infusion::STD Swab Test::http://spacegm.com/texas-specialty-clinic/assets/images/menu5.jpg"
                                          
                                          
                                          
                                          
                                          
                                          
                                          
                                          
                                          

                                        };

                           


                          //sub menu 1 image changer
                          $('#header_submenu_2 li:eq(1)').css('background-image','url(http://texasspecialtyclinic.com/assets/images/menu1.jpg)');
                          $('#header_submenu_2 li').not("#header_submenu_2 li:eq(1)").on("mouseover", function(event){
                              var listIndex1 =  $(this).index();
                              var view_content1 = serviceList2[listIndex1].split("::");
                              $('#header_submenu_2 li:eq(1)').css('background-image','url('+view_content1[2]+')');
                              $('#header_submenu_2 li:eq(1)').html('<a href="'+view_content1[0]+'/">'+view_content1[1]);
                              // alert($(this).closest('ul').attr('id'));
                          });

                          
                      });
                  </script>


 <div class="header">
         <header class="header__brandArea">
            <div class="header__brandContainer">
               <a href="http://spacegm.com/texas-specialty-clinic/" class="header__brandLogo">
               <img src="http://spacegm.com/texas-specialty-clinic/assets/images/logo.png" alt="" title="" class="header__brandIcon header__brandIcon--desktop">
               <img src="http://spacegm.com/texas-specialty-clinic/assets/images/mobilelogo.png" alt="" title="" class="header__brandIcon header__brandIcon--mobile">
               </a>
               <ul class="header__brandOpts">
                <li class="header-req-btn">
                  <span class="featured-block__button button button--orange "  id="myBtn-header" style="">Request an appointment <img src="http://spacegm.com/texas-specialty-clinic/assets/images/btn-icon-arrow-right.png" class="arrow-image-req" style="margin-left: 5px;"> </span>
                  <!-- <button>Open Modal</button> -->
                  <div id="myModal" class="modal">
                    <div class="modal-content">
                      <span class="close">&times;</span>
                      <div class="container">
                      <h3 style="text-align: center;color: #fff;margin-top: 30px;">REQUEST AN APPOINTMENT</h3>
                      <form action="/action_page.php">
                      <div class="row">
                        <div class="col-25">
                          <label for="fname">Name*</label>
                        </div>
                        <div class="col-75">
                          <input type="text" id="name" name="name" placeholder="Your name.." required="required">
                        </div>
                      </div>
                      
                      
                      <div class="row">
                        <div class="col-25">
                          <label for="email">Email*</label>
                        </div>
                        <div class="col-75">
                          <input type="email" id="email" name="email" placeholder="Your E-mail.." required="required">
                        </div>
                      </div>
                      
                      <div class="row">
                        <div class="col-25">
                          <label for="phone">Mobile</label>
                        </div>
                        <div class="col-75">
                          <input type="number" id="phone" name="phone" placeholder="Your Phone No..">
                        </div>
                      </div>

                      <div class="row">
                        <div class="col-25">
                          <label for="subject">Comments</label>
                        </div>
                        <div class="col-75">
                          <textarea id="subject" name="subject" placeholder="Write something.." style="height:200px"></textarea>
                        </div>
                      </div>
                      
                      <div class="row">
                        <input type="submit" value="Submit" class="featured-block__button button button--orange btn-align"  id="myBtn-header">
                      </div>
                    </form>
                  </div>
                </div>
          </div>

          <script>
          // Get the modal
          var modal = document.getElementById("myModal");

          // Get the button that opens the modal
          var btn = document.getElementById("myBtn-header");

          // Get the <span> element that closes the modal
          var span = document.getElementsByClassName("close")[0];

          // When the user clicks the button, open the modal 
          btn.onclick = function() {
            modal.style.display = "block";
          }

          // When the user clicks on <span> (x), close the modal
          span.onclick = function() {
            modal.style.display = "none";
          }

          // When the user clicks anywhere outside of the modal, close it
          window.onclick = function(event) {
            if (event.target == modal) {
              modal.style.display = "none";
            }
          }
        </script>
                </li>


                  <ul class="social-icons social-icons--header" style="margin-bottom: 10px;">
                     <li class="social-icons__item">
                        <a href="" target="_blank" class="social-icons__link"><i class="fab fa-twitter"></i></a>
                     </li>
                     <li class="social-icons__item">
                        <a href="" target="_blank" class="social-icons__link"><i class="fab fa-facebook"></i></a>
                     </li>
                  
                     <li class="social-icons__item">
                        <a href="" target="_blank" class="social-icons__link"><i class="fab fa-instagram"></i></a>
                     </li>
                  </ul>
                 
                 
                  <li class="header__brandOptsItem translateli google-lang">
                        <div id="google_translate_element">
                        </div>
                  </li>
                 
                  <li class="header__brandOptsItem header__brandOptsItem--menuIcon">
                     <div class="header__brandOptsTarget header__menuIcon mobileMenuTrigger">
                        <span class="mobileMenuTriggerInner"></span>
                     </div>
                  </li>

               </ul>
            </div>
         </header>
         <navigation role="navigation" class="header__navigation gradient-background">
         <div class="header__navigationWrap">
            <div class="header__navigationContainer">
               <ul class="header__list ">
                  

                  <li class="header__list__item  header__list__item--520"><a href="">About Us </a></li>

                  <li class="header__list__item  header__list__item--parent parentNavItem  header__list__item--508">
                     <a href="">Treatment &amp; Services</a>
                     <div class="dropdown">
                         <ul id="header_submenu_1" class="header__list__sub-menu header__list__sub-menu--1">
                           <li class=""><a href="">PrEP &amp; PEP Access</a></li>
                           <li class=""><a href="http://spacegm.com/texas-specialty-clinic/services/std/">STD's</a></li>
                           <li class=""><a href="http://spacegm.com/texas-specialty-clinic/services/hiv/">HIV / Aids</a></li>
                           <li class=""><a href="">Psychiatric Care</a></li>
                           <li class=""><a href="http://spacegm.com/texas-specialty-clinic/services/hormonal-therapy/">Hormonal Therapy</a></li>
                           
                           
                        </ul>
                     </div>
                  </li>
                 
                 
                <!--   <li class="header__list__item  header__list__item--parent parentNavItem  header__list__item--517">
                     <a href="">Patient Resources</a>
                     <div class="dropdown">
                        <ul class="header__list__sub-menu header__list__sub-menu--1">
                           <li class="header__list__sub-menu__item header__list__sub-menu--1__item  header__list__item--600"><a href="">Request an appointment</a></li>
                           <li class="header__list__sub-menu__item header__list__sub-menu--1__item  header__list__item--618"><a href="">Patient Forms</a></li>
                           <li class="header__list__sub-menu__item header__list__sub-menu--1__item  header__list__item--617"><a href="">Insurances</a></li>
                        </ul>
                     </div>
                  </li> -->
                   <li class="header__list__item  header__list__item--parent parentNavItem  header__list__item--508">
                    <a href="">Testing &amp; Vaccination</a>


                   <div class="dropdown2">
                         <ul id="header_submenu_2" class="header__list__sub-menu header__list__sub-menu--1">
                           
                           <!-- <li class=""><a href="">PrEP &amp; PEP Access</a></li>
                           <li class=""><a href="">Sexually Transmitted Disease</a></li>
                           <li class=""><a href="">PrEP &amp; PEP Access</a></li>
                           <li class=""><a href="">Sexually Transmitted Disease</a></li>
                           <li class=""><a href="">HIV Services</a></li>
                           <li class=""><a href="">Psychiatric Care</a></li> -->



                          <li class=""><a href="http://spacegm.com/texas-specialty-clinic/testing/hiv-testing/">HIV Testing</a></li>
                          <li class=""><a href="">Chlamydia Testing</a></li>



                          <li class=""><a href="http://spacegm.com/texas-specialty-clinic/testing/hiv-testing/">HIV Testing</a></li>
                          <li class=""><a href="">Chlamydia &amp; Gonorrhea Testing</a></li>
                          <li class=""><a href="">Syphilis Testing</a></li>
                          <li class=""><a href="">Herpes Testing</a></li>
                          <li class=""><a href="">Hepatitis Testing</a></li>
                          <li class=""><a href="">Complete Blood Count</a></li>
                          <li class=""><a href="">Urinalysis Testing</a></li>
                          <li class=""><a href="">STD Swab Test</a></li>
                           
                           
                        </ul>
                     </div>
                   </li>

                   <!-- <li class="header__list__item  header__list__item--520"><a href="">Request an appointment</a></li> -->

                  <li class="header__list__item  header__list__item--520"><a href="">Meet Our Providers</a></li>
                
                  <li class="header__list__item  header__list__item--520"><a href="">Contact Us</a></li>
               
               </ul>
            </div>
         </div>
         </naviation>
      </div> 
       <div class="header__overlay"></div>
      <script>
         var cartImgIcon = "assets/svg/cart_icond41d.svg?>";
         var donateImgIcon = "assets/svg/donate_icond41d.svg?>";
         
      </script>
      <style type="text/css">
        @media (max-width: 600px){
          .demo{
            position: absolute;
    z-index: 99;
    background: #fff;
    pointer-events: none;
          }
          .mobile-menu__nav li .dropdown--trigger{
            width: 100% !important;
          }
        }
      </style>
      <div class="mobile-menu">
         <div class="mobile-menu__overlay"></div>
         <div class="mobile-menu__list">
            <ul class="mobile-menu__nav ">
                <li class="mobile-menu__nav__item  mobile-menu__nav__item--520"><a href="">About Us</a></li>

               <li class="mobile-menu__nav__item  mobile-menu__nav__item--parent parentNavItem  mobile-menu__nav__item--508 dropdown--trigger">
                  <a href="#" class="demo">Treatment &amp; Services</a>
                  <div class="dropdown">
                     <ul class="mobile-menu__nav__sub-menu mobile-menu__nav__sub-menu--1">
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">PrEP &amp; PEP Access</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="http://spacegm.com/texas-specialty-clinic/services/std/">STD's</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="http://spacegm.com/texas-specialty-clinic/services/hiv/">HIV / Aids</a></li>

                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">Psychiatric Care</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--549"><a href="http://spacegm.com/texas-specialty-clinic/services/hormonal-therapy/">Hormonal Therapy</a></li>
                        <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--548"><a target="_blank" href="">IV Infusion</a></li> -->
                        <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="">Iv Nutritional Therapy</a></li> -->
                        <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="services/occupational-health-care/">Occupational Health Care</a></li> -->
                        <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="">Oncology</a></li> -->
                        <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="services/physical-therapy/">Physical Therapy</a></li> -->
                         <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="services/podiatry-treatment/">Podiatry Treatment</a></li> -->
                          <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="">PrEP</a></li> -->
                           <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="services/primary-care/">Primary Care</a></li> -->
                           <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="">Travel Medicine</a></li> -->
                           <!-- <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--3836"><a target="_blank" href="services/urgent-care/">Urgent Care</a></li> -->
                     </ul>
                  </div>
               </li>
              
               
              <!--  <li class="mobile-menu__nav__item  mobile-menu__nav__item--parent parentNavItem  mobile-menu__nav__item--517">
                  <a href="">Patient Resources</a>
                  <div class="dropdown">
                     <ul class="mobile-menu__nav__sub-menu mobile-menu__nav__sub-menu--1">
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--600"><a target="_blank" href="request-an-appointment/">Request an appointment</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--618"><a target="_blank" href="">Patient Forms</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--617"><a target="_blank" href="">Insurances</a></li>
                       
                     </ul>
                  </div>
               </li> -->

             <li class="mobile-menu__nav__item  mobile-menu__nav__item--parent parentNavItem  mobile-menu__nav__item--508 dropdown--trigger">
              <a href="" class="demo">Testing &amp; Vaccination</a>

              <div class="dropdown">
                     <ul class="mobile-menu__nav__sub-menu mobile-menu__nav__sub-menu--1">
                        



                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="http://spacegm.com/texas-specialty-clinic/testing/hiv-testing/">HIV Testing</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">Chlamydia &amp; Gonorrhea Testing</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">Syphilis Testing</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">Herpes Testing</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">Hepatitis Testing</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">Complete Blood Count</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">Urinalysis Testing</a></li>
                        <li class="mobile-menu__nav__sub-menu__item mobile-menu__nav__sub-menu--1__item  mobile-menu__nav__item--550"><a href="">STD Swab Test</a></li>
                     </ul>
                  </div></li>


             <!-- <li class="mobile-menu__nav__item  mobile-menu__nav__item--520"><a href="" target="_blank">Request an appointment</a></li> -->


               <li class="mobile-menu__nav__item  mobile-menu__nav__item--520"><a href="" target="_blank">Meet Our Providers</a></li>

              
               <li class="mobile-menu__nav__item  mobile-menu__nav__item--521"><a href="" target="_blank">Contact</a></li>
            </ul>
         </div>
      </div>