---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

Education
======
* M.S. in Computer Science, University of California - Los Angeles(UCLA), 2025(expected)
* B.Eng. in Computer Science and Engineering, Hong Kong University of Science and Technology(HKUST), 2023

Work experience
======
* 2022 June - 2022 Aug: Junior AI Developer
  * Vetrackr(Hong Kong)
  * Duties includes:
    * Collaborated with the team to contribute to risk management model of predicting taxi drivers’ security ranks
    * Retrieved the weather data through Python web crawler, and collected driving data through plug-in detectors on taxis
    * Implemented algorithms based on GPS to identify distinctive driving behaviors with over 90% accuracy.
    * Established a deep learning system from scratch with multi-layer LSTM to predict driver risk appetite and recommended speed based on
    weather conditions, attaining a precision over 40%
    * Evaluated the risk prediction model with saliency analysis to ensure the reliability and robustness

  
Skills
======
* Programming Language: C/C++, Python, Java, HTML, CSS, JavaScript(JS), SQL
* Machine Learning: Numpy, Pandas, Pytorch, CNN, Transformer, LSTM, Large Language Model(LLM), Casual Analysis
* Other skills: Cloud Computing(HDFS,Hadoop,Spark), Recommendation System, Blockchain, Computer Network

Publications
======
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
  

