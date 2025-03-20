# Exprexx Project

## Articles Create
- post를 써서 만들고 
- get을 써서 불러온다는 것을 배웠다

## url 설계 방법
- url로 리소스(특정 페이지, 혹은 정보)를 표현하고 
- http 매소드로 이 리소스에 어떤 행위를 할지 한다고 한다.

``` 
console.log("Hello world")
```

# SQL 쿼리 정리

## 1. `User` 테이블 생성

```sql
CREATE TABLE User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 유저 고유 ID, 자동 증가
    email TEXT NOT NULL UNIQUE,            -- 이메일, 필수 입력, 유니크 값
    password TEXT NOT NULL,                -- 비밀번호, 필수 입력
    profile_url TEXT,                      -- 프로필 URL, 선택 입력
    nickname TEXT NOT NULL UNIQUE          -- 닉네임, 필수 입력, 유니크 값
);
