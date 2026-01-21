# orchid-orm 1.42

在`1.42`版本之前, `orCreate`会自动给之前的`query`加上`LIMIT 1`, 所以写`where()`等同于写`where().take()`.  
在`1.42`版本之后, `orCreate`会自动去掉之前`query`的`LIMIT 1`, 所以写`where().take()`等同于写`where()`.

# orchid-orm 1.36

Stop handling `null` in column `parse`, add `parseNull` for this instead.
