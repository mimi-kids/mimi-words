# Owner review sheet

Every row is a DRAFT (`reviewed: false`). To approve a row, set `"reviewed": true` for that id in
`data/words.json` (only the owner does this). Chinese + pinyin are not yet checked against CC-CEDICT:
run `python3 tools/check_cedict.py <cedict file>` first (see CONTENT_SOURCES.md).

Category labels (`category_labels` in words.json) are drafts too: animals = Animals / 动物 / สัตว์, food = Food / 食物 / อาหาร, body = Body / 身体 / ร่างกาย, colors = Colors / 颜色 / สี, numbers = Numbers / 数字 / ตัวเลข, home = Home / 家 / บ้าน.

| # | id | picture | en | zh | pinyin | th | note |
|---|---|---|---|---|---|---|---|
| 1 | animal-cat | 1f408.svg | cat | 猫 | māo | แมว |  |
| 2 | animal-dog | 1f415.svg | dog | 狗 | gǒu | หมา |  |
| 3 | animal-bird | 1f426.svg | bird | 鸟 | niǎo | นก |  |
| 4 | animal-fish | 1f41f.svg | fish | 鱼 | yú | ปลา |  |
| 5 | animal-elephant | 1f418.svg | elephant | 大象 | dàxiàng | ช้าง |  |
| 6 | animal-lion | 1f981.svg | lion | 狮子 | shīzi | สิงโต |  |
| 7 | animal-tiger | 1f405.svg | tiger | 老虎 | lǎohǔ | เสือ |  |
| 8 | animal-monkey | 1f412.svg | monkey | 猴子 | hóuzi | ลิง |  |
| 9 | animal-horse | 1f40e.svg | horse | 马 | mǎ | ม้า |  |
| 10 | animal-cow | 1f404.svg | cow | 牛 | niú | วัว |  |
| 11 | animal-pig | 1f416.svg | pig | 猪 | zhū | หมู |  |
| 12 | animal-chicken | 1f414.svg | chicken | 鸡 | jī | ไก่ |  |
| 13 | animal-duck | 1f986.svg | duck | 鸭子 | yāzi | เป็ด |  |
| 14 | animal-rabbit | 1f407.svg | rabbit | 兔子 | tùzi | กระต่าย |  |
| 15 | animal-mouse | 1f401.svg | mouse | 老鼠 | lǎoshǔ | หนู |  |
| 16 | animal-snake | 1f40d.svg | snake | 蛇 | shé | งู |  |
| 17 | animal-frog | 1f438.svg | frog | 青蛙 | qīngwā | กบ |  |
| 18 | animal-bear | 1f43b.svg | bear | 熊 | xióng | หมี |  |
| 19 | animal-panda | 1f43c.svg | panda | 熊猫 | xióngmāo | แพนด้า |  |
| 20 | animal-giraffe | 1f992.svg | giraffe | 长颈鹿 | chángjǐnglù | ยีราฟ |  |
| 21 | animal-zebra | 1f993.svg | zebra | 斑马 | bānmǎ | ม้าลาย |  |
| 22 | animal-turtle | 1f422.svg | turtle | 乌龟 | wūguī | เต่า |  |
| 23 | animal-butterfly | 1f98b.svg | butterfly | 蝴蝶 | húdié | ผีเสื้อ |  |
| 24 | animal-ant | 1f41c.svg | ant | 蚂蚁 | mǎyǐ | มด |  |
| 25 | animal-sheep | 1f411.svg | sheep | 羊 | yáng | แกะ |  |
| 26 | food-apple | 1f34e.svg | apple | 苹果 | píngguǒ | แอปเปิล |  |
| 27 | food-banana | 1f34c.svg | banana | 香蕉 | xiāngjiāo | กล้วย |  |
| 28 | food-orange | 1f34a.svg | orange | 橙子 | chéngzi | ส้ม |  |
| 29 | food-grapes | 1f347.svg | grapes | 葡萄 | pútao | องุ่น | pinyin pútao: second syllable neutral in CC-CEDICT? check |
| 30 | food-watermelon | 1f349.svg | watermelon | 西瓜 | xīguā | แตงโม |  |
| 31 | food-strawberry | 1f353.svg | strawberry | 草莓 | cǎoméi | สตรอว์เบอร์รี |  |
| 32 | food-mango | 1f96d.svg | mango | 芒果 | mángguǒ | มะม่วง |  |
| 33 | food-pineapple | 1f34d.svg | pineapple | 菠萝 | bōluó | สับปะรด |  |
| 34 | food-coconut | 1f965.svg | coconut | 椰子 | yēzi | มะพร้าว |  |
| 35 | food-carrot | 1f955.svg | carrot | 胡萝卜 | húluóbo | แครอท |  |
| 36 | food-corn | 1f33d.svg | corn | 玉米 | yùmǐ | ข้าวโพด |  |
| 37 | food-tomato | 1f345.svg | tomato | 西红柿 | xīhóngshì | มะเขือเทศ |  |
| 38 | food-egg | 1f95a.svg | egg | 鸡蛋 | jīdàn | ไข่ |  |
| 39 | food-rice | 1f35a.svg | rice | 米饭 | mǐfàn | ข้าว |  |
| 40 | food-bread | 1f35e.svg | bread | 面包 | miànbāo | ขนมปัง |  |
| 41 | food-milk | 1f95b.svg | milk | 牛奶 | niúnǎi | นม |  |
| 42 | food-water | 1f4a7.svg | water | 水 | shuǐ | น้ำ | picture is a water droplet |
| 43 | food-cake | 1f370.svg | cake | 蛋糕 | dàngāo | เค้ก |  |
| 44 | food-ice-cream | 1f366.svg | ice cream | 冰淇淋 | bīngqílín | ไอศกรีม |  |
| 45 | food-noodles | 1f35c.svg | noodles | 面条 | miàntiáo | บะหมี่ | th บะหมี่ (egg noodles); ก๋วยเตี๋ยว is the other option |
| 46 | food-cookie | 1f36a.svg | cookie | 饼干 | bǐnggān | คุกกี้ |  |
| 47 | food-candy | 1f36c.svg | candy | 糖果 | tángguǒ | ลูกอม |  |
| 48 | food-cheese | 1f9c0.svg | cheese | 奶酪 | nǎilào | ชีส |  |
| 49 | food-juice | 1f9c3.svg | juice | 果汁 | guǒzhī | น้ำผลไม้ |  |
| 50 | food-potato | 1f954.svg | potato | 土豆 | tǔdòu | มันฝรั่ง |  |
| 51 | body-eye | 1f441.svg | eye | 眼睛 | yǎnjing | ตา |  |
| 52 | body-ear | 1f442.svg | ear | 耳朵 | ěrduo | หู |  |
| 53 | body-nose | 1f443.svg | nose | 鼻子 | bízi | จมูก |  |
| 54 | body-mouth | 1f444.svg | mouth | 嘴 | zuǐ | ปาก |  |
| 55 | body-tongue | 1f445.svg | tongue | 舌头 | shétou | ลิ้น |  |
| 56 | body-hand | 270b.svg | hand | 手 | shǒu | มือ |  |
| 57 | body-foot | 1f9b6.svg | foot | 脚 | jiǎo | เท้า |  |
| 58 | body-leg | 1f9b5.svg | leg | 腿 | tuǐ | ขา |  |
| 59 | body-tooth | 1f9b7.svg | tooth | 牙齿 | yáchǐ | ฟัน |  |
| 60 | body-arm | 1f4aa.svg | arm | 胳膊 | gēbo | แขน | picture is a flexed biceps |
| 61 | body-heart | 2764.svg | heart | 心 | xīn | หัวใจ | picture is a red heart symbol, not an organ |
| 62 | body-brain | 1f9e0.svg | brain | 大脑 | dànǎo | สมอง |  |
| 63 | color-red | 1f534.svg | red | 红色 | hóngsè | สีแดง |  |
| 64 | color-blue | 1f535.svg | blue | 蓝色 | lánsè | สีน้ำเงิน |  |
| 65 | color-green | 1f7e2.svg | green | 绿色 | lǜsè | สีเขียว |  |
| 66 | color-yellow | 1f7e1.svg | yellow | 黄色 | huángsè | สีเหลือง |  |
| 67 | color-orange | 1f7e0.svg | orange | 橙色 | chéngsè | สีส้ม |  |
| 68 | color-purple | 1f7e3.svg | purple | 紫色 | zǐsè | สีม่วง |  |
| 69 | color-brown | 1f7e4.svg | brown | 棕色 | zōngsè | สีน้ำตาล |  |
| 70 | color-black | 26ab.svg | black | 黑色 | hēisè | สีดำ |  |
| 71 | color-white | 26aa.svg | white | 白色 | báisè | สีขาว |  |
| 72 | color-pink | 1fa77.svg | pink | 粉红色 | fěnhóngsè | สีชมพู | picture is a pink heart (no pink circle emoji) |
| 73 | number-one | 31-20e3.svg | one | 一 | yī | หนึ่ง |  |
| 74 | number-two | 32-20e3.svg | two | 二 | èr | สอง |  |
| 75 | number-three | 33-20e3.svg | three | 三 | sān | สาม |  |
| 76 | number-four | 34-20e3.svg | four | 四 | sì | สี่ |  |
| 77 | number-five | 35-20e3.svg | five | 五 | wǔ | ห้า |  |
| 78 | number-six | 36-20e3.svg | six | 六 | liù | หก |  |
| 79 | number-seven | 37-20e3.svg | seven | 七 | qī | เจ็ด |  |
| 80 | number-eight | 38-20e3.svg | eight | 八 | bā | แปด |  |
| 81 | number-nine | 39-20e3.svg | nine | 九 | jiǔ | เก้า |  |
| 82 | number-ten | 1f51f.svg | ten | 十 | shí | สิบ |  |
| 83 | home-house | 1f3e0.svg | house | 房子 | fángzi | บ้าน |  |
| 84 | home-door | 1f6aa.svg | door | 门 | mén | ประตู |  |
| 85 | home-window | 1fa9f.svg | window | 窗户 | chuānghu | หน้าต่าง |  |
| 86 | home-bed | 1f6cf.svg | bed | 床 | chuáng | เตียง |  |
| 87 | home-chair | 1fa91.svg | chair | 椅子 | yǐzi | เก้าอี้ |  |
| 88 | home-sofa | 1f6cb.svg | sofa | 沙发 | shāfā | โซฟา |  |
| 89 | home-toilet | 1f6bd.svg | toilet | 马桶 | mǎtǒng | โถส้วม | zh 马桶 = toilet bowl |
| 90 | home-bathtub | 1f6c1.svg | bathtub | 浴缸 | yùgāng | อ่างอาบน้ำ |  |
| 91 | home-light-bulb | 1f4a1.svg | light bulb | 灯泡 | dēngpào | หลอดไฟ | zh 灯泡 = light bulb |
| 92 | home-key | 1f511.svg | key | 钥匙 | yàoshi | กุญแจ |  |
| 93 | home-alarm-clock | 23f0.svg | alarm clock | 闹钟 | nàozhōng | นาฬิกาปลุก | zh 闹钟 = alarm clock |
| 94 | home-television | 1f4fa.svg | television | 电视 | diànshì | โทรทัศน์ |  |
| 95 | home-phone | 1f4f1.svg | phone | 手机 | shǒujī | โทรศัพท์มือถือ | zh 手机 = mobile phone |
| 96 | home-book | 1f4d6.svg | book | 书 | shū | หนังสือ |  |
| 97 | home-scissors | 2702.svg | scissors | 剪刀 | jiǎndāo | กรรไกร |  |
| 98 | home-broom | 1f9f9.svg | broom | 扫帚 | sàozhou | ไม้กวาด |  |
| 99 | home-soap | 1f9fc.svg | soap | 肥皂 | féizào | สบู่ |  |
| 100 | home-umbrella | 2602.svg | umbrella | 伞 | sǎn | ร่ม |  |
