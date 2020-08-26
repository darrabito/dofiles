import moment from 'moment';
import publicSuffixList from 'psl';
import Url from 'url';
import tree from 'state';
import _ from 'lodash';
import {track} from '../utility/analytics';
import warnAboutStandDown from 'messaging/notifications/outbound/warnAboutStandDown';
import cache from 'cache/cashbackCache';
import {resetCache} from 'cache/siteCache';
import hasFeature from 'utility/hasFeature';
import LRU from 'lru-cache';

const standDownCache = LRU({
  max: 500,
  maxAge: 1000 * 15
});

const afSrcRequests = {};
const noRedirectPatterns = [
  '[?&]?afsrc=1',
  'priceline\\.com.+refid=',
  'shareasale.com/r.cfm',
  'shareasale.com/u.cfm',
  'booking\\.com.*aid=1241344.*'
];

const affiliateRawPatterns = [
  'priceline\\.com.+refid=',
  '[?&]?afsrc=1',
  'rffrid=.*\\.hcom\\.us',
  'vistaprint\\.com.*psite=mkwid',
  'https?\\:\\/\\/eightsleep.*[\\?\\&]utm_medium=(?:search-paid|display|cpm|email|referral)',
  'prf.hn/click/camref',
  'booking\\.com.*aid=1241344.*',
  '^https?\\:\\/\\/.{0,10}\\.?ebay.*(mkevt|mkcid|campid)',
  '^https?\\:\\/\\/www\\.(?:homeaway|vrbo).*[\\?\\&]utm_medium=(?:cpc|banners|affiliates)',
  'marriott\\.com.*(?:[\\?\\&]scid=|[\\?\\&]pid=)',
  'asos\\.com.*(?:[\\?\\&]affid=)',
  '^https:\\/\\/www\\.booking\\.com\\/.*\\?.*aid=(?!(301377|1|2|3|4|5|6|10|100000|100001|100002|100003|100004|100005|100006|100007|100008|100009|100010|100011|100012|100013|100014|100015|100016|100017|100018|100019|100020|100021|100022|100023|100024|100025|100026|100027|100028|100029|100030|100031|100032|100033|100034|100035|100036|100037|100038|100039|100040|100041|100042|100043|100044|100045|100046|100047|100048|100049|100050|100051|100052|100053|100054|100055|100056|100057|100058|100059|100060|100061|100062|100063|100064|100065|100066|100067|100068|100069|100070|100071|100072|100073|100074|100075|100076|100077|100078|100079|100080|100081|100082|100083|100084|100085|100086|100087|100088|100089|100090|100091|100092|100093|100094|100095|100096|100097|100098|100099|100100|100101|100102|100103|100104|100105|100106|100107|100108|100109|100110|100111|100112|100113|100114|100115|100500|100600|100601|100602|100994|100996|100997|100998|100999|110000|110001|110002|110003|110004|110005|110006|110007|110008|110009|110010|110011|110012|110013|110014|110015|110016|110017|110018|110019|110020|110021|110022|110023|110024|110025|110026|110027|110028|110029|110030|110031|110032|110033|110034|110035|110036|110037|110038|110039|110040|110041|110042|110043|110044|110045|110046|110047|110048|110049|110050|110051|110052|110053|110054|110055|110056|110057|110058|110059|110060|110061|110062|110063|110064|110065|110066|110067|110068|110069|110070|110071|110072|110073|110074|110075|110076|110077|110078|110079|110080|110081|110082|110083|110084|110085|110086|110087|110088|110089|110090|110091|110092|110093|110094|110095|110096|110097|110098|110099|110100|110101|110102|110103|110104|110105|110106|110107|110108|110109|110110|110111|110112|110113|110114|110115|110116|110117|110118|110119|110120|110121|110122|110123|110124|110125|110126|110127|110128|110129|110130|110131|110132|110133|110134|110135|110136|110137|110138|110139|110140|110141|110142|110143|110144|110145|110146|110147|110148|110149|110150|110151|110152|110153|110154|110155|200003|200004|200005|200011|200014|200020|200021|200022|200023|200024|200025|200030|200041|200057|200058|200059|200060|200061|200062|200063|200064|200070|200072|200077|200078|200079|200080|200081|200083|200084|200085|200086|200087|200088|200102|200112|200113|200114|200117|200121|200132|200134|200135|200136|200152|200157|200159|200160|200161|200186|200192|200207|202000|202001|202002|202003|202004|202005|202006|202007|202008|202009|202010|202011|202012|202013|202014|202015|202016|202017|202018|202019|202020|202021|202022|202023|202024|202025|202026|202027|202028|202029|202030|202031|202032|202033|202034|202035|202036|202037|202038|202039|202040|202041|202042|202043|202044|202045|202046|202047|202048|202049|202050|202051|202052|202053|202054|202055|202056|202057|202058|202059|202060|202061|202062|202063|202064|202065|202066|202067|202068|202069|202070|202071|202072|202073|202074|202075|202076|202077|202078|202079|202080|202081|202082|202083|202084|202085|202086|202087|202088|202089|202090|202091|202092|202093|202095|202096|202097|202098|202099|202100|202101|202102|202103|202104|202105|202106|202107|202108|202109|202110|202111|202112|202113|202114|202115|202116|202117|202118|202119|202120|202121|202122|202123|202124|202125|202126|202127|202128|202129|202130|202131|202132|202133|202134|202135|202136|202137|202138|202139|202140|202141|202142|202143|202144|202145|202146|202147|202148|202149|202150|202151|202152|202153|202154|202155|202156|202157|202158|202159|202160|202161|202162|202163|300006|300037|300039|300054|301500|301501|301569|301585|302347|302348|302349|302350|302351|302352|302724|302962|302963|302964|302965|302967|302968|302969|303650|303651|303652|303903|303927|303930|304142|304393|304515|304625|304641|304642|305315|305316|305318|305319|305320|305321|305322|305373|305974|306194|306246|306623|307353|307415|308372|308454|309373|309914|310138|311555|317862|325542|329649|330232|331424|336248|336249|336347|336348|336690|336973|337354|337434|337435|337436|337437|337438|337439|337440|337441|337442|337443|337444|337445|337446|337447|337448|337449|337450|337451|337452|337453|337454|337455|337456|337457|337458|337459|337460|337461|337462|337463|337464|337465|337466|337467|337468|337469|337470|337471|337472|337473|337474|337475|337476|337477|337478|337479|337480|337481|337482|337483|337484|337485|337486|337487|337488|337489|337490|337491|337492|337493|337494|337495|337496|337497|337498|337499|337500|337501|337502|337503|337504|337505|337506|337507|337508|337509|337510|337511|337512|337513|337514|337515|337516|337517|337518|337519|337520|337521|337522|337523|337524|337525|337526|337527|337528|337529|337530|337531|337532|337533|337534|337535|337536|337537|337538|337539|337540|337541|337542|337543|337544|337545|337546|337547|337548|337549|337550|337551|337552|337553|337554|337555|337556|337557|337558|337559|337560|337561|337562|337563|337564|337565|337566|337567|337568|337569|337570|337571|337572|337573|337574|337575|337576|337577|337578|337579|337580|337581|337582|337583|337584|337585|337586|337587|337588|337589|337590|337591|337592|337593|337594|337595|337596|337597|337598|337599|337600|337601|337602|337603|337604|337605|337606|337607|337608|337609|337610|337611|337612|337613|337614|337615|337616|337617|337618|337619|337620|337621|337622|337623|337624|337625|337626|337627|337628|337629|337630|337631|337632|337633|337634|337635|337636|337637|337638|337639|337640|337641|337642|337643|337644|337645|337646|337647|337648|337649|337650|337651|337652|337654|337655|337656|337657|337658|337659|337660|337661|337662|337663|337664|337665|337666|337667|337668|337669|337670|337671|337672|337673|337674|337675|337676|337677|337678|337679|337680|337681|337682|337683|337684|337685|337686|337687|337688|337689|337690|337691|337692|337693|337694|337695|337696|337697|337698|337699|337700|337701|337702|337703|337704|337705|337706|337707|337708|337709|337710|337711|337712|337713|337714|337715|337716|337717|337718|337719|337720|337721|337722|337723|337724|337725|337726|337727|337728|337729|337730|337731|337732|337733|337734|337735|337736|337737|337738|337739|337740|337741|337742|337743|337744|337745|337746|337747|337748|337749|337750|337751|337752|337753|337754|337755|337756|337757|337758|337759|337760|337761|337762|337763|337764|337765|337766|337767|337768|337769|337770|337771|337772|337773|337774|337775|337776|337777|337778|337779|337780|337781|337782|337783|337784|337785|337786|337787|337788|338492|339022|339023|339277|339278|339305|339423|339424|340941|342227|342228|344149|344292|345379|346868|346869|346871|346872|346873|346874|346875|347094|347095|347228|347229|347230|347231|347232|347233|347234|347235|347236|347399|348191|348251|348253|348531|348533|349970|349982|350243|350244|350338|350339|351292|353577|354156|354518|354544|354764|354765|354766|354767|354768|354769|354770|354771|354772|354773|354774|354775|354776|354777|354778|354779|354780|354781|354782|354783|354784|354785|354786|354787|354788|354789|354790|354791|354792|354793|354794|354795|354796|355028|355976|356197|364126|364127|364128|364129|364130|364131|364132|364133|364134|368769|370047|372219|375616|377623|378957|379014|379015|379016|381238|381239|381240|381241|381641|381654|382975|385106|385536|385537|386188|386588|387799|387800|387801|387802|388312|390537|393670|393671|394178|395600|396094|398058|398608|399869|399999|400000|801983|801984|801985|801986|802443|802952|803100|803548|803549|803550|805634|808898|808899|808900|811598|814798|816258|817287|820868|820869|821021|822612|828370|844868|856821|856823|856825|856827|856832|862065|862067|863032|863033|875802|886298|896644|898922|939121|939122|939123|956939|956941|956942|1150150|1150153|1151993|1165067|1168701|1168702|1168703|1168704|1168705|1168706|1168707|1168708|1168709|1168710|1179492|1182229|1183949|1184019|1184020|1186016|1190473|1194636|1194637|1194657|1194660|1194661|1211836|1214692|1214697|1214698|1214699|1214700|1214701|1214703|1214704|1214708|1214709|1214710|1214712|1215564|1225736|1229592|1229693|1236665|1248208|1262335|1263239|1295009|1311838|1319239|1369911|1430499|1430500|1509996|1514934|1514938|1514939|1514943|1514946|1514948|7322459|7342516|7342517|7342518|7342519|7342520|7342521|7342522|7342523|7342524|7342525|7342526|7342527|7342528|7342529|7342530|7342531|7342532|7342533|7342534|7342535|7342536|7342537|7342538|7342539|7342540|7342541|7342542|7342543|7342544|7342545|7342546|7342547|7342548|7342549|7342550|7342551|7342552|7342553|7342554|7342555|7342556|7342557|7342558|7342559|7342560|7342561|7342562|7342563|7342564|7342565|7342566|7342567|7342568|7342569|7342570|7342571|7342572|7342573|7342574|7342575|7342576|7342577|7342578|7342579|7342580|7342581|7342582|7342583|7342584|7342585|7342586|7342587|7342588|7342589|7342590|7342591|7342592|7342593|7342594|7342595|7342596|7342597|7342598|7342599|7342600|7342601|7342602|7342603|7342604|7342605|7342606|7342607|7342608|7342609|7342610|7342611|7342612|7342613|7342614|7342615|7342616|7342617|7342618|7342619|7342620|7342621|7342622|7342623|7342624|7342625|7342626|7342627|7342628|7342629|7342630|7342631|7342632|7342633|7342634|7342635|7342636|7342637|7342638|7342639|7342640|7342641|7342642|7342643|7342644|7342645|7342646|7342647|7342648|7342649|7342650|7342651|7342652|7342653|7342654|7342655|7342656|7342657|7342658|7342659|7342660|7342661|7342662|7342663|7342664|7342665|7342666|7342667|7342668|7342669|7342670|7342671|7342672|7342673|7342674|7342675|7342676|7342677|7342678|7342679|7342680|7342681|7342682|7342683|7342684|7342685|7342686|7342687|7342688|7342689|7342690|7342691|7342692|7342693|7342694|7342695|7342696|7342697|7342698|7342699|7342700|7342701|7342702|7342703|7342704|7342705|7342706|7342707|7342708|7342709|7342710|7342711|7342712|7342713|7342714|7342715|7342716|7342717|7342718|7342719|7342720|7342721|7342722|7342723|7342724|7342725|7342726|7342727|7342728|7342729|7342730|7342731|7342732|7342733|7342734|7342735|7342736|7342737|7342738|7342739|7342740|7342741|7342742|7342743|7342744|7342745|7342746|7342747|7342748|7342749|7342750|7342751|7342752|7342753|7342754|7342755|7342756|7342757|7342758|7342759|7342760|7342761|7342762|7342763|7342764|7342765|7342766|7342767|7342768|7342769|7342770|7342771|7342772|7342773|7342774|7342775|7342776|7342777|7342778|7342779|7342780|7342781|7342782|7342783|7342784|7342785|7342786|7342787|7342788|7342789|7342790|7342791|7342792|7342793|7342794|7342795|7342796|7342797|7342798|7342799|7342800|7342801|7342802|7342803|7342804|7342805|7342806|7342807|7342808|7342809|7342810|7342811|7342812|7342813|7342814|7342815|7342816|7342817|7342818|7342819|7342820|7342821|7342822|7342823|7342824|7342825|7342826|7342827|7342828|7342829|7342830|7342831|7342832|7342833|7342834|7342835|7342836|7342837|7342838|7342839|7342840|7342841|7342842|7342843|7342844|7342845|7342846|7342847|7342848|7342849|7342850|7342851|7342852|7342853|7342854|7342855|7342856|7342857|7342858|7342859|7342860|7342861|7342862|7342863|7342864|7342865|7342866|7342867|7342868|7342869|7342870|7342871|7342872|7342873|7342874|7342875|7342876|7342877|7342878|7342879|7342880|7342881|7342882|7342883|7342884|7342885|7342886|7342887|7342888|7342889|7342890|7342891|7342892|7342893|7342894|7342895|7342896|7342897|7342898|7342899|7342900|7342901|7342902|7342903|7342904|7342905|7342906|7342907|7342908|7342909|7342910|7342911|7342912|7342913|7342914|7342915|7342916|7342917|7342918|7342919|7342920|7342921|7342922|7342923|7342924|7342925|7342926|7342927|7342928|7342929|7342930|7342931|7342932|7342933|7342934|7342935|7342936|7342937|7342938|7342939|7342940|7342941|7342942|7342943|7342944|7342945|7342946|7342947|7342948|7342949|7342950|7342951|7342952|7342953|7342954|7342955|7342956|7342957|7342958|7342959|7342960|7342961|7342962|7342963|7342964|7342965|7342966|7342967|7342968|7342969|7342970|7342971|7342972|7342973|7342974|7342975|7342976|7342977|7342978|7342979|7342980|7342981|7342982|7342983|7342984|7342985|7342986|7342987|7342988|7342989|7342990|7342991|7342992|7342993|7342994|7342995|7342996|7342997|7342998|7342999|7343000|7343001|7343002|7343003|7343004|7343005|7343006|7343007|7343008|7343009|7343010|7343011|7343012|7343013|7343014|7343015|7343016|7343017|7343018|7343019|7343020|7343021|7343022|7343023|7343024|7343025|7343026|7343027|7343028|7343029|7343030|7343031|7343032|7343033|7343034|7343035|7343036|7343037|7343038|7343039|7343040|7343041|7343042|7343043|7343044|7343045|7343046|7343047|7343048|7343049|7343050|7343051|7343052|7343053|7343054|7343055|7343056|7343057|7343058|7343059|7343060|7343061|7343062|7343063|7343064|7343065|7343066|7343067|7343068|7343069|7343070|7343071|7343072|7343073|7343074|7343075|7343076|7343077|7343078|7343079|7343080|7343081|7343082|7343083|7343084|7343085|7343086|7343087|7343088|7343089|7343090|7343091|7343092|7343093|7343094|7343095|7343096|7343097|7343098|7343099|7343100|7343101|7343102|7343103|7343104|7343105|7343106|7343107|7343108|7343109|7343110|7343111|7343112|7343113|7343114|7343115|7343116|7343117|7343118|7343119|7343120|7343121|7343122|7343123|7343124|7343125|7343126|7343127|7343128|7343129|7343130|7343131|7343132|7343133|7343134|7343135|7343136|7343137|7343138|7343139|7343140|7343141|7343142|7343143|7343144|7343145|7343146|7343147|7343148|7343149|7343150|7343151|7343152|7343153|7343154|7343155|7343156|7343157|7343158|7343159|7343160|7343161|7343162|7343163|7343164|7343165|7343166|7343167|7343168|7343169|7343170|7343171|7343172|7343173|7343174|7343175|7343176|7343177|7343178|7343179|7343180|7343181|7343182|7343183|7343184|7343185|7343186|7343187|7343188|7343189|7343190|7343191|7343192|7343193|7343194|7343195|7343196|7343197|7343198|7343199|7343200|7343201|7343202|7343203|7343204|7343205|7343206|7343207|7343208|7343209|7343210|7343211|7343212|7343213|7343214|7343215|7343216|7343217|7343218|7343219|7343220|7343221|7343222|7343223|7343224|7343225|7343226|7343227|7343228|7343229|7343230|7343231|7343232|7343233|7343234|7343235|7343236|7343237|7343238|7343239|7343240|7343241|7343242|7343243|7343244|7343245|7343246|7343247|7343248|7343249|7343250|7343251|7343252|7343253|7343254|7343255|7343256|7343257|7343258|7343259|7343260|7343261|7343262|7343263|7343264|7343265|7343266|7343267|7343268|7343269|7343270|7343271|7343272|7343273|7343274|7343275|7343276|7343277|7343278|7343279|7343280|7343281|7343282|7343283|7343284|7343285|7343286|7343287|7343288|7343289|7343290|7343291|7343292|7343293|7343294|7343295|7343296|7343297|7343298|7343299|7343300|7343301|7343302|7343303|7343304|7343305|7343306|7343307|7343308|7343309|7343310|7343311|7343312|7343313|7343314|7343315|7343316|7343317|7343318|7343319|7343320|7343321|7343322|7343323|7343324|7343325|7343326|7343327|7343328|7343329|7343330|7343331|7343332|7343333|7343334|7343335|7343336|7343337|7343338|7343339|7343340|7343341|7343342|7343343|7343344|7343345|7343346|7343347|7343348|7343349|7343350|7343351|7343352|7343353|7343354|7343355|7343356|7343357|7343358|7343359|7343360|7343361|7343362|7343363|7343364|7343365|7343366|7343367|7343368|7343369|7343370|7343371|7343372|7343373|7343374|7343375|7343376|7343377|7343378|7343379|7343380|7343381|7343382|7343383|7343384|7343385|7343386|7343387|7343388|7343389|7343390|7343391|7343392|7343393|7343394|7343395|7343396|7343397|7343398|7343399|7343400|7343401|7343402|7343403|7343404|7343405|7343406|7343407|7343408|7343409|7343410|7343411|7343412|7343413|7343414|7343415|7343416|7343417|7343418|7343419|7343420|7343421|7343422|7343423|7343424|7343425|7343426|7343427|7343428|7343429|7343430|7343431|7343432|7343433|7343434|7343435|7343436|7343437|7343438|7343439|7343440|7343441|7343442|7343443|7343444|7343445|7343446|7343447|7343448|7343449|7343450|7343451|7343452|7343453|7343454|7343455|7343456|7343457|7343458|7343459|7343460|7343461|7343462|7343463|7343464|7343465|7343466|7343467|7343468|7343469|7343470|7343471|7343472|7343473|7343474|7343475|7343476|7343477|7343478|7343479|7343480|7343481|7343482|7343483|7343484|7343485|7343486|7343487|7343488|7343489|7343490|7343491|7343492|7343493|7343494|7343495|7343496|7343497|7343498|7343499|7343500|7343501|7343502|7343503|7343504|7343505|7343506|7343507|7343508|7343509|7343510|7343511|7343512|7343513|7343514|7343515|7343516|7343517|7343518|7343519|7343520|7343521|7343522|7343523|7343524|7343525|7343526|7343527|7343528|7343529|7343530|7343531|7343532|7343533|7343534|7343535|7343536|7343537|7343538|7343539|7343540|7343541|7343542|7343543|7343544|7343545|7343546|7343547|7343548|7343549|7343550|7343551|7343552|7343553|7343554|7343555|7343556|7343557|7343558|7343559|7343560|7343561|7343562|7343563|7343564|7343565|7343566|7343567|7343568|7343569|7343570|7343571|7343572|7343573|7343574|7343575|7343576|7343577|7343578|7343579|7343580|7343581|7343582|7343583|7343584|7343585|7343586|7343587|7343588|7343589|7343590|7343591|7343592|7343593|7343594|7343595|7343596|7343597|7343598|7343599|7343600|7343601|7343602|7343603|7343604|7343605|7343606|7343607|7343608|7343609|7343610|7343611|7343612|7343613|7343614|7343615|7343616|7343617|7343618|7343619|7343620|7343621|7343622|7343623|7343624|7343625|7343626|7343627|7343628|7343629|7343630|7343631|7343632|7343633|7343634|7343635|7343636|7343637|7343638|7343639|7343640|7343641|7343642|7343643|7343644|7343645|7343646|7343647|7343648|7343649|7343650|7343651|7343652|7343653|7343654|7343655|7343656|7343657|7343658|7343659|7343660|7343661|7343662|7343663|7343664|7343665|7343666|7343667|7343668|7343669|7343670|7343671|7343672|7343673|7343674|7343675|7343676|7343677|7343678|7343679|7343680|7343681|7343682|7343683|7343684|7343685|7343686|7343687|7343688|7343689|7343690|7343691|7343692|7343693|7343694|7343695|7343696|7343697|7343698|7343699|7343700|7343701|7343702|7343703|7343704|7343705|7343706|7343707|7343708|7343709|7343710|7343711|7343712|7343713|7343714|7343715|7343716|7343717|7343718|7343719|7343720|7343721|7343722|7343723|7343724|7343725|7343726|7343727|7343728|7343729|7343730|7343731|7343732|7343733|7343734|7343735|7343736|7343737|7343738|7343739|7343740|7343741|7343742|7343743|7343744|7343745|7343746|7343747|7343748|7343749|7343750|7343751|7343752|7343753|7343754|7343755|7343756|7343757|7343758|7343759|7343760|7343761|7343762|7343763|7343764|7343765|7343766|7343767|7343768|7343769|7343770|7343771|7343772|7343773|7343774|7343775|7343776|7343777|7343778|7343779|7343780|7343781|7343782|7343783|7343784|7343785|7343786|7343787|7343788|7343789|7343790|7343791|7343792|7343793|7343794|7343795|7343796|7343797|7343798|7343799|7343800|7343801|7343802|7343803|7343804|7343805|7343806|7343807|7343808|7343809|7343810|7343811|7343812|7343813|7343814|7343815|7343816|7343817|7343818|7343819|7343820|7343821|7343822|7343823|7343824|7343825|7343826|7343827|7343828|7343829|7343830|7343831|7343832|7343833|7343834|7343835|7343836|7343837|7343838|7343839|7343840|7343841|7343842|7343843|7343844|7343845|7343846|7343847|7343848|7343849|7343850|7343851|7343852|7343853|7343854|7343855|7343856|7343857|7343858|7343859|7343860|7343861|7343862|7343863|7343864|7343865|7343866|7343867|7343868|7343869|7343870|7343871|7343872|7343873|7343874|7343875|7343876|7343877|7343878|7343879|7343880|7343881|7343882|7343883|7343884|7343885|7343886|7343887|7343888|7343889|7343890|7343891|7343892|7343893|7343894|7343895|7343896|7343897|7343898|7343899|7343900|7343901|7343902|7343903|7343904|7343905|7343906|7343907|7343908|7343909|7343910|7343911|7343912|7343913|7343914|7343915|7343916|7343917|7343918|7343919|7343920|7343921|7343922|7343923|7343924|7343925|7343926|7343927|7343928|7343929|7343930|7343931|7343932|7343933|7343934|7343935|7343936|7343937|7343938|7343939|7343940|7343941|7343942|7343943|7343944|7343945|7343946|7343947|7343948|7343949|7343950|7343951|7343952|7343953|7343954|7343955|7343956|7343957|7343958|7343959|7343960|7343961|7343962|7343963|7343964|7343965|7343966|7343967|7343968|7343969|7343970|7343971|7343972|7343973|7343974|7343975|7343976|7343977|7343978|7343979|7343980|7343981|7343982|7343983|7343984|7343985|7343986|7343987|7343988|7343989|7343990|7343991|7343992|7343993|7343994|7343995|7343996|7343997|7343998|7343999|7344000|7344001|7344002|7344003|7344004|7344005|7344006|7344007|7344008|7344009|7344010|7344011|7344012|7344013|7344014|7344015|7344016|7344017|7344018|7344019|7344020|7344021|7344022|7344023|7344024|7344025|7344026|7344027|7344028|7344029|7344030|7344031|7344032|7344033|7344034|7344035|7344036|7344037|7344038|7344039|7344040|7344041|7344042|7344043|7344044|7344045|7344046|7344047|7344048|7344049|7344050|7344051|7344052|7344053|7344054|7344055|7344056|7344057|7344058|7344059|7344060|7344061|7344062|7344063|7344064|7344065|7344066|7344067|7344068|7344069|7344070|7344071|306956|11|388953|388954|389686|399758|815012|816240|854291|1913|2258|2259|2260|2261|2262|2263|2264|2265|2981|316488|345956|320485|339742|328144|328244|328246|328247|328268|328301|328312|328586|328806|328906|329024|329276|329519|329533|329536|329594|330191|330707|333513|337094|337095|337096|337097|338344|332731|347105|349405|349406|387330|800906|800907|811578|821183|855236|898224|899371|1209369|1225061|1238738|1238743|1238744|1258470|1258471|1258472|1603822|331867|1141322|335756|335757|335758|335759|335760|335761|335762|336204|336317|337007|337009|337010|337794|349404|375457|375458|382067|393789|395652|396063|397301|397304|397306|397748|398874|424596|800006|804395|804396|805131|810497|811052|812231|836835|898291|1571518|333476|335132|17|10130|10240|10250|10288|10310|10330|10360|10388|10410|10530|10808|11270|16068|16098|16258|16458|16618|16658|16938|17758|102310|104308|104598|107450|108020|137298|337862|344752|347545|347546|347547|347548|347549|349407|352636|841989|1080550|1081160|1127178|1145768|1145769|1145770|1145771|338019|338361|340475|341213|342609|354963|336318|347346|347347|347348|348228|357038|359212|375089|376488|376489|376490|376491|376492|376494|376495|376496|381149|381150|384599|385092|386261|386690|388675|388676|388677|389393|391677|805382|805384|818478|822938|829337|830638|834633|939990|1466477|1466482|847058|351250|313258|351204|357252|371291|371457|371458|371459|371460|371461|371462|371666|372931|372989|372990|373412|373415|374716|375916|376023|376057|376058|376059|376060|376061|376062|376430|376431|376432|376907|376917|376974|818923|819415|819485|819848|821643|825342|825937|828821|828822|828824|828938|833803|833807|833808|833826|834325|835822|837597|838894|838899|843569|845931|847594|848120|848125|848127|848128|848132|848133|848134|848135|851492|851637|854572|854639|854640|858218|858220|858254|858257|858259|858260|858262|858263|858264|858265|858266|858267|858268|858269|858270|858271|858272|858273|858275|858276|858277|858278|858279|858280|858281|858283|858284|858285|858286|858287|858288|858289|858290|858291|858292|859445|859474|859475|859590|861659|863544|863576|863587|865216|871149|877809|877843|877845|881883|885452|891892|891894|891898|892050|893165|893167|893237|900998|900999|905267|905272|925352|925364|925365|942917|942924|942926|942933|942936|942941|942946|942950|963491|963492|964814|1146474|1146885|1152257|1174381|1307380|398452|398453|398486|398487|800001|800002|802798|803656|804281|804389|804401|804402|805393|806148|806150|806194|806211|806212|806738|807102|807258|807263|807289|807290|807443|807555|807807|807822|808429|808430|808431|808442|808523|808551|808658|808984|808987|810421|812175|812178|812179|812329|812341|812351|812353|813072|813073|813075|813076|813077|815146|816745|816939|816942|822567|822924|823207|825970|838971|841988|845134|855575|858226|859487|866184|870634|872855|872857|874048|887294|887297|895476|897572|899440|935919|942820|946294|946297|950552|954162|960651|964180|964181|964182|964289|964293|964620|964621|964623|964625|965012|965178|1127179|1127217|1127279|1127362|1127366|1127367|1127578|1138486|1139167|1139900|1140051|1140403|1141416|1145796|1145797|1145799|1145805|1146773|1147240|1147722|1148063|1148064|1148072|1153743|1162902|1165092|1165093|1169321|1185590|1189111|1194493|1196265|1199549|1211233|1211234|1212294|1212302|1212307|1212310|1212311|1212313|1212335|1212338|1229718|1233328|1233426|1235088|1246686|1246687|1250969|1255423|1264449|1268356|1268791|1269357|1269361|1269366|1269369|1271824|1272479|1275098|1280960|1280961|1280962|1280963|1280964|1280965|1280966|1280967|1280968|1290137|1290139|1292766|1293201|1310299|1311044|1311083|1318395|1324405|1324943|1325337|1352201|1360878|1360879|1360881|1360883|1364884|1364886|1364890|1364892|1364894|1372383|1373667|1380025|1380026|1380045|1387157|1391229|1391230|1391231|1391232|1391233|1391234|1391235|1391236|1391237|1391238|1391239|1391240|1391241|1391242|1391243|1391244|1391245|1391246|1391247|1391248|1391249|1391250|1391251|1391252|1391253|1391254|1391255|1391256|1391257|1391258|1396939|1405547|1405548|1405549|1405550|1405551|1405552|1405553|1405554|1405555|1405556|1405557|1405558|1405559|1405560|1405561|1405562|1405563|1417946|1425873|1429279|1436928|1436929|1438246|1444224|1450754|1450757|1458358|1458359|1458360|1458361|1462068|1462120|1462121|1462126|1462129|1462179|1462194|1462214|1462233|1462255|1464431|1464434|1464694|1464783|1465101|1468749|1468755|1468758|1476697|1484708|1495061|1501448|1502518|1503436|1503489|1503492|1503534|1527200|1540935|1540937|1542967|1563382|346864|346866|346867|859133|939025|956509|964694|1151752|1237679|1237680|1241491|1312467|1273985|1274068|1274073|1274077|1274078|1275687|1275688|1275691|1275692|1275694|1275951|1277963|1281797|1284442|1307253|1307254|1322869|1322873|1328522|1336734|1336735|1336736|1358556|1358558|1376758|1425812|1435033|1440134|1441272|1442789|1442790|1442798|1501535|1524666|1327669|1327668|1607355|1351146|1355365|1355341|1381107|1381132|1381145|1430676|1523297|1523299|1460827|1460836|1465205|1465206|1465207|1473479|1538187|1568467|1509999|1530399|1563250|1563283|1571817|1563287|1563288|1608400|1612324|1562823|1563284|1575485|1600346|1601424|1601426|1601427|1625394|1563251)(;|&))'
];
const affiliateMatchPatterns = [
  '*://*.7eer.net/*',
  '*://*.evyy.net/*',
  '*://*.avantlink.com/*',
  '*://goto.orientaltrading.com/*',
  '*://goto.target.com/*',
  '*://affiliates.toysrus.com/*',
  '*://affiliates.abebooks.com/*',
  '*://affiliates.babiesrus.com/*',
  '*://linksynergy.walmart.com/*',
  '*://partners.hostgator.com/*',
  '*://partners.hotwire.com/*',
  '*://partners.jawbone.com/*',
  '*://partners.wantable.co/*',
  '*://www.pepperjamnetwork.com/*',
  '*://click.linksynergy.com/*',
  '*://shareasale.com/*',
  '*://tracking.groupon.com/*',
  '*://www.anrdoezrs.net/*',
  '*://www.awin1.com/*',
  '*://www.dpbolvw.net/*',
  '*://www.gopjn.com/*',
  '*://www.jdoqocy.com/*',
  '*://www.kqzyfj.com/*',
  '*://www.pjatr.com/*',
  '*://www.pjtra.com/*',
  '*://www.pntra.com/*',
  '*://www.pntrac.com/*',
  '*://www.pntrs.com/*',
  '*://www.qksrv.net/*',
  '*://www.shareasale.com/*',
  '*://www.tkqlhce.com/*',
  '*://commission-junction.com/*',
  '*://ftjcfx.com/*',
  '*://lduhtrp.net/*',
  '*://linksynergy.com/*',
  '*://tqlkg.com/*',
  '*://*.goto.orientaltrading.com/*',
  '*://*.goto.target.com/*',
  '*://*.affiliates.toysrus.com/*',
  '*://*.affiliates.abebooks.com/*',
  '*://*.affiliates.babiesrus.com/*',
  '*://*.linksynergy.walmart.com/*',
  '*://*.partners.hostgator.com/*',
  '*://*.partners.hotwire.com/*',
  '*://*.partners.jawbone.com/*',
  '*://*.partners.wantable.co/*',
  '*://*.www.pepperjamnetwork.com/*',
  '*://*.click.linksynergy.com/*',
  '*://*.shareasale.com/*',
  '*://*.tracking.groupon.com/*',
  '*://*.www.anrdoezrs.net/*',
  '*://*.www.awin1.com/*',
  '*://*.www.dpbolvw.net/*',
  '*://*.www.gopjn.com/*',
  '*://*.www.jdoqocy.com/*',
  '*://*.www.kqzyfj.com/*',
  '*://*.www.pjatr.com/*',
  '*://*.www.pjtra.com/*',
  '*://*.www.pntra.com/*',
  '*://*.www.pntrac.com/*',
  '*://*.www.pntrs.com/*',
  '*://*.www.qksrv.net/*',
  '*://*.www.shareasale.com/*',
  '*://*.www.tkqlhce.com/*',
  '*://*.commission-junction.com/*',
  '*://*.ftjcfx.com/*',
  '*://*.lduhtrp.net/*',
  '*://*.linksynergy.com/*',
  '*://*.tqlkg.com/*',
  '*://*.sjv.io/*',
  '*://hpn.houzz.com/*',
  '*://prf.hn/*',
  '*://goto.walmart.com/*',
  '*://*.pxf.io/*',
  '*://*.uikc.net/*',
  '*://goto.target.com/*',
  '*://hpn.houzz.com/*',
  '*://linkto.hrblock.com/*',
  '*://*.uqhv.net/*',
  '*://*.atkw.net/*',
  '*://*.ojrq.net/*',
  '*://*.prf.hn/*',
  '*://disneyplus.bn5x.net/*',
  '*://go.web.plus.espn.com/*'
];

const newTabRestrictedDomains = ['orbitz.com', 'booking.com'];

let ignoreNextStandDown;

export function setIgnoreStandDown() {
  ignoreNextStandDown = true;
  setTimeout(() => {
    ignoreNextStandDown = null;
  }, 10000);
}

export function standDown(url, requestId, tabId) {
  const parsed = url ? Url.parse(url) : null;
  const domain = parsed ? publicSuffixList.get(parsed.hostname) : null;
  if (ignoreNextStandDown) {
    return;
  }
  const selfStandDown = tree.get(['selfStandDown', `${domain}_${tabId}`]);
  if (selfStandDown && selfStandDown !== tabId) {
    tree.set(['selfStandDown', `${domain}_${tabId}`], false);
  }
  if (newTabRestrictedDomains.indexOf(domain) > -1) {
    tabId = 'all';
  }
  if (requestId === 'cashbackActivate') {
    tree.set(
      ['couponsAffiliateDisabledSites', `${domain}_${tabId}`],
      moment()
        .add(60, 'minutes')
        .unix()
    );
    setIgnoreStandDown();
  } else if (requestId) {
    const storageKey = `WarningNotif-${domain}`; // For this UI path, we aren't able to determine which competitor the user came from, so we look for a generic throttle key
    cache.del(domain);
    chrome.storage.local.get(storageKey, data => {
      const lastSeenWarning = _.get(data, storageKey);
      if (
        (moment
          .unix(lastSeenWarning)
          .add(1, 'days')
          .isBefore(moment()) ||
          !lastSeenWarning) &&
        hasFeature('credits_competitor_click_warning')
      ) {
        chrome.tabs.query({url: `*://*.${domain}/*`}, tabs => {
          _.forEach(tabs, tab => {
            if (tab.id !== tabId) {
              warnAboutStandDown(tab.id);
            }
          });
        });
      }
    });
    if (!tree.get(['couponsDisabledSites', `${domain}_${tabId}`])) {
      tree.set(
        ['couponsDisabledSites', `${domain}_${tabId}`],
        moment()
          .add(60, 'minutes')
          .unix()
      );
    }
  } else {
    setIgnoreStandDown();
  }
}

function affiliateMonitor(patterns) {
  return e => {
    const requestId = e.requestId;
    if (standDownCache.has(e.tabId)) {
      standDown(e.url, requestId, e.tabId);
    }
    if (afSrcRequests[requestId] && afSrcRequests[requestId] > moment().unix()) {
      setTimeout(() => {
        delete afSrcRequests[requestId];
      }, 2000);
      standDown(e.url, requestId, e.tabId);
      if (e.statusCode > 299 && e.statusCode < 400) {
        const redirectUrl = _.get(
          _.find(e.responseHeaders, h => h.name === 'Location'),
          'value'
        );
        if (redirectUrl) {
          standDown(redirectUrl, requestId, e.tabId);
        }
      }
    }
    if (isAffiliateRequest(patterns, e.url)) {
      resetCache();
      if (shouldStandDown(patterns, e.url, e.tabId, requestId)) {
        if (findMatch(noRedirectPatterns, e.url)) {
          standDownCache.set(e.tabId, true);
          standDown(e.url, requestId, e.tabId);
          if (/honey\.io/.test(e.url)) {
            honeyStandDownHandler(e.url);
          }
        } else {
          afSrcRequests[requestId] = moment()
            .add(1, 'minutes')
            .unix();
        }
      }
      track('affiliateRequestMatch', {
        affiliateUrl: e.url,
        requestId
      });
    }
  };
}
chrome.webRequest.onHeadersReceived.addListener(
  affiliateMonitor(affiliateRawPatterns),
  {urls: ['<all_urls>'], types: ['main_frame']},
  ['responseHeaders']
);
chrome.webRequest.onHeadersReceived.addListener(
  affiliateMonitor(['.*']),
  {urls: affiliateMatchPatterns, types: ['main_frame']},
  ['responseHeaders']
);

chrome.webRequest.onHeadersReceived.addListener(
  details => {
    if (/\?afsrc=1&ha=1/.test(details.url)) {
      return {redirectUrl: 'https://www.gstatic.com/generate_204'};
    }
  },
  {urls: ['<all_urls>'], types: ['main_frame']},
  ['blocking', 'responseHeaders']
);

function isAffiliateRequest(patterns, url) {
  const match = findMatch(patterns, url);
  return match && !/\?afsrc=1&ha=1/.test(url);
}

function shouldStandDown(patterns, url, tabId, requestId) {
  if (
    /7882476|7620299|3\*BIL10dmOI|301377|14063|1022327|d80280c4d072234ae21480685f7f99d3|c\/101044|utm_campaign=101044|5575322144|126336|groupon\.com\/.*206976|camref\:1011l/.test(
      url
    )
  ) {
    // standard links
    return false;
  }
  if (/5575143053/.test(url)) {
    // Stand down to our ebay product affiliate
    tree.set(['selfStandDown', `ebay.com_${tabId}`], tabId);
    return true;
  }
  return true;
}

function findMatch(patterns, target) {
  return !!_.find(patterns, pattern => {
    const exp = new RegExp(pattern, 'i');
    return exp.test(target);
  });
}

function pullOriginalTLD(tabUrl) {
  return decodeURIComponent(tabUrl)
    .split('url=')[1]
    .split('/')[2]
    .replace(/^www\./, '');
}

function honeyStandDownHandler(tabUrl) {
  const tld = pullOriginalTLD(tabUrl); //pull the original referrer TLD from honey URL
  const storageKey = `honeyWarningNotif-${tld}`;
  const tldCache = cache.get(tld);
  chrome.storage.local.get(storageKey, data => {
    const lastSeenWarning = _.get(data, storageKey);
    if (
      _.get(tldCache, 'activated') &&
      (moment
        .unix(lastSeenWarning)
        .add(1, 'days')
        .isBefore(moment()) ||
        !lastSeenWarning) &&
      hasFeature('credits_competitor_click_warning')
    ) {
      tree.set(['honeyActivatedSites', tld], true);
    }
  });
}
